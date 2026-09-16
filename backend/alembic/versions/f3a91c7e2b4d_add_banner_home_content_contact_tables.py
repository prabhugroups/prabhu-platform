"""add banner, home_content, stakeholders, associates, spokespersons, tenant_contacts tables

Revision ID: f3a91c7e2b4d
Revises: 69929190a3a7
Create Date: 2026-09-16 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a91c7e2b4d'
down_revision: Union[str, Sequence[str], None] = '69929190a3a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('banners',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('link', sa.String(length=512), nullable=True),
    sa.Column('file', sa.String(length=512), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_banners_tenant_id'), 'banners', ['tenant_id'], unique=False)

    op.create_table('home_content',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('about_content', sa.Text(), nullable=True),
    sa.Column('highlighted_content', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', name='uq_home_content_tenant')
    )
    op.create_index(op.f('ix_home_content_tenant_id'), 'home_content', ['tenant_id'], unique=False)

    op.create_table('stakeholders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('logo_file', sa.String(length=512), nullable=False),
    sa.Column('link', sa.String(length=512), nullable=True),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stakeholders_tenant_id'), 'stakeholders', ['tenant_id'], unique=False)

    op.create_table('associates',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('logo_file', sa.String(length=512), nullable=False),
    sa.Column('link', sa.String(length=512), nullable=True),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_associates_tenant_id'), 'associates', ['tenant_id'], unique=False)

    op.create_table('spokespersons',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=True),
    sa.Column('role', sa.String(length=255), nullable=True),
    sa.Column('phone', sa.String(length=32), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('image', sa.String(length=512), nullable=True),
    sa.Column('show', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', name='uq_spokespersons_tenant')
    )
    op.create_index(op.f('ix_spokespersons_tenant_id'), 'spokespersons', ['tenant_id'], unique=False)

    op.create_table('tenant_contacts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tenant_id', sa.Integer(), nullable=False),
    sa.Column('phone_primary', sa.String(length=32), nullable=True),
    sa.Column('phone_secondary', sa.String(length=32), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('location', sa.String(length=255), nullable=True),
    sa.Column('opening_hours', sa.String(length=255), nullable=True),
    sa.Column('whatsapp_number', sa.String(length=32), nullable=True),
    sa.Column('registered_office', sa.String(length=255), nullable=True),
    sa.Column('branch_office', sa.String(length=255), nullable=True),
    sa.Column('copyright_text', sa.String(length=255), nullable=True),
    sa.Column('map_file', sa.String(length=512), nullable=True),
    sa.Column('facebook_url', sa.String(length=512), nullable=True),
    sa.Column('instagram_url', sa.String(length=512), nullable=True),
    sa.Column('youtube_url', sa.String(length=512), nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('tenant_id', name='uq_tenant_contacts_tenant')
    )
    op.create_index(op.f('ix_tenant_contacts_tenant_id'), 'tenant_contacts', ['tenant_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tenant_contacts_tenant_id'), table_name='tenant_contacts')
    op.drop_table('tenant_contacts')
    op.drop_index(op.f('ix_spokespersons_tenant_id'), table_name='spokespersons')
    op.drop_table('spokespersons')
    op.drop_index(op.f('ix_associates_tenant_id'), table_name='associates')
    op.drop_table('associates')
    op.drop_index(op.f('ix_stakeholders_tenant_id'), table_name='stakeholders')
    op.drop_table('stakeholders')
    op.drop_index(op.f('ix_home_content_tenant_id'), table_name='home_content')
    op.drop_table('home_content')
    op.drop_index(op.f('ix_banners_tenant_id'), table_name='banners')
    op.drop_table('banners')
