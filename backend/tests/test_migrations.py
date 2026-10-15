import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from app.models import domain as m


def test_initial_migration_upgrade_check_downgrade(tmp_path):
    root = Path(__file__).resolve().parents[2]
    url = f"sqlite:///{(tmp_path / 'migrations.db').as_posix()}"
    env = {**os.environ, "DATABASE_URL": url}

    def alembic(*args):
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", *args],
            cwd=root,
            env=env,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, result.stdout + result.stderr

    alembic("upgrade", "head")
    engine = create_engine(url)
    assert len(set(inspect(engine).get_table_names()) - {"alembic_version"}) == 17
    inspector = inspect(engine)
    assert inspector.get_pk_constraint("source_chunk_concepts")["constrained_columns"] == [
        "chunk_id",
        "concept_id",
    ]
    assert all(
        fk["options"]["ondelete"] == "CASCADE"
        for fk in inspector.get_foreign_keys("source_chunk_concepts")
    )
    mode_constraint = next(
        c
        for c in inspect(engine).get_check_constraints("challenges")
        if c["name"] == "challenge_mode"
    )
    assert "'numerical'" in mode_constraint["sqltext"]
    engine.dispose()
    alembic("check")
    engine = create_engine(url)
    with Session(engine) as db:
        user = m.User(clerk_user_id="migration-test")
        db.add(user)
        db.flush()
        course = m.Course(user_id=user.id, title="Preserved course")
        db.add(course)
        db.flush()
        file = m.CourseFile(
            course_id=course.id,
            filename="notes.pdf",
            source_type="pdf",
            object_key="migration-notes",
            content_type="application/pdf",
            size_bytes=1,
        )
        db.add(file)
        db.flush()
        chunk = m.SourceChunk(
            course_id=course.id,
            file_id=file.id,
            content="Preserved evidence",
            page_number=4,
            embedding=[1.0] + [0.0] * 1023,
        )
        db.add(chunk)
        db.commit()
        chunk_id = chunk.id
    engine.dispose()
    alembic("downgrade", "0001")
    engine = create_engine(url)
    assert "embedding" not in {c["name"] for c in inspect(engine).get_columns("source_chunks")}
    assert "source_chunk_concepts" not in inspect(engine).get_table_names()
    engine.dispose()
    alembic("upgrade", "head")
    alembic("check")
    engine = create_engine(url)
    with Session(engine) as db:
        chunk = db.get(m.SourceChunk, chunk_id)
        assert chunk.content == "Preserved evidence" and chunk.page_number == 4
        assert chunk.embedding is None
    engine.dispose()
    alembic("downgrade", "base")
    engine = create_engine(url)
    assert inspect(engine).get_table_names() == ["alembic_version"]
    engine.dispose()
    alembic("upgrade", "head")


def test_postgres_migration_sql_compiles_without_database():
    root = Path(__file__).resolve().parents[2]
    env = {**os.environ, "DATABASE_URL": "postgresql+psycopg://example:example@localhost/example"}
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head", "--sql"],
        cwd=root,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert "TIMESTAMP WITH TIME ZONE" in result.stdout and "UUID" in result.stdout
    assert "CREATE TABLE source_chunks" in result.stdout
    assert "'numerical'" in result.stdout
    assert "CREATE EXTENSION IF NOT EXISTS vector" in result.stdout
    assert "ADD COLUMN embedding VECTOR(1024)" in result.stdout
    assert "CREATE TABLE source_chunk_concepts" in result.stdout
    assert "PRIMARY KEY (chunk_id, concept_id)" in result.stdout
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "alembic",
            "-c",
            "backend/alembic.ini",
            "downgrade",
            "0002:0001",
            "--sql",
        ],
        cwd=root,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert "DROP COLUMN embedding" in result.stdout
    assert "DROP TABLE source_chunk_concepts" in result.stdout
    assert "DROP EXTENSION" not in result.stdout
