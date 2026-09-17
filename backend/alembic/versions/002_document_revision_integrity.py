"""Enforce unique document revisions per contract.

Revision ID: 002_document_revision_integrity
Revises: 001_initial
"""
from alembic import op


revision = "002_document_revision_integrity"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_document_contract_version",
        "documents",
        ["contract_id", "version_number"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_document_contract_version", "documents", type_="unique")