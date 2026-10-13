import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect


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
    assert len(set(inspect(engine).get_table_names()) - {"alembic_version"}) == 16
    mode_constraint = next(
        c
        for c in inspect(engine).get_check_constraints("challenges")
        if c["name"] == "challenge_mode"
    )
    assert "'numerical'" in mode_constraint["sqltext"]
    engine.dispose()
    alembic("check")
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
