"""Persistent knowledge embeddings and shared concept evidence.

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    postgres = op.get_bind().dialect.name == "postgresql"
    if postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.add_column(
        "source_chunks",
        sa.Column(
            "embedding", Vector(1024) if postgres else sa.JSON(none_as_null=True), nullable=True
        ),
    )
    op.create_table(
        "source_chunk_concepts",
        sa.Column("chunk_id", sa.Uuid(), nullable=False),
        sa.Column("concept_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["chunk_id"], ["source_chunks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("chunk_id", "concept_id"),
    )


def downgrade() -> None:
    op.drop_table("source_chunk_concepts")
    op.drop_column("source_chunks", "embedding")
    # The extension may be shared with other applications; never drop it here.
