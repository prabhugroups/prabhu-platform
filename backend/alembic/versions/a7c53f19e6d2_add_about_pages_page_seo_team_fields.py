"""add about_pages, page_seo tables and team structured fields

Revision ID: a7c53f19e6d2
Revises: f3a91c7e2b4d
Create Date: 2026-09-16 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c53f19e6d2'
down_revision: Union[str, Sequence[str], None] = 'f3a91c7e2b4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('about_pages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('section', sa.String(length=32), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('highlighted_content', sa.Text(), nullable=True),
    sa.Column('bullet_point_content', sa.Text(), nullable=True),
    sa.Column('file', sa.String(length=512), nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', 'section', name='uq_about_pages_tenant_section')
    )
    op.create_index(op.f('ix_about_pages_tenant_id'), 'about_pages', ['tenant_id'], unique=False)

    op.create_table('page_seo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('page_key', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('keywords', sa.String(length=512), nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', 'page_key', name='uq_page_seo_tenant_page_key')
    )
    op.create_index(op.f('ix_page_seo_tenant_id'), 'page_seo', ['tenant_id'], unique=False)

    op.add_column('teams', sa.Column('name', sa.String(length=255), nullable=True))
    op.add_column('teams', sa.Column('role', sa.String(length=255), nullable=True))
    op.add_column('teams', sa.Column('company_name', sa.String(length=255), nullable=True))
    # Backfill from the legacy {name, title} JSON convention already used in
    # additional_info (see app/modules/teams/models.py) so existing rows
    # don't need to be manually re-entered.
    op.execute(
        "UPDATE teams SET name = JSON_UNQUOTE(JSON_EXTRACT(additional_info, '$.name')) "
        "WHERE additional_info IS NOT NULL AND JSON_EXTRACT(additional_info, '$.name') IS NOT NULL"
    )
    op.execute(
        "UPDATE teams SET role = JSON_UNQUOTE(JSON_EXTRACT(additional_info, '$.title')) "
        "WHERE additional_info IS NOT NULL AND JSON_EXTRACT(additional_info, '$.title') IS NOT NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('teams', 'company_name')
    op.drop_column('teams', 'role')
    op.drop_column('teams', 'name')

    op.drop_index(op.f('ix_page_seo_tenant_id'), table_name='page_seo')
    op.drop_table('page_seo')

    op.drop_index(op.f('ix_about_pages_tenant_id'), table_name='about_pages')
    op.drop_table('about_pages')
