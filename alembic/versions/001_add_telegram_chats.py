"""add telegram chats support

Revision ID: 001_add_telegram_chats
Revises: 
Create Date: 2025-12-13 23:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_add_telegram_chats'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Создаём таблицу tg_chats
    op.create_table(
        'tg_chats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tg_chat_id', sa.BigInteger(), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tg_chats_id'), 'tg_chats', ['id'], unique=False)
    op.create_index(op.f('ix_tg_chats_tg_chat_id'), 'tg_chats', ['tg_chat_id'], unique=True)

    # Создаём таблицу chat_admins
    op.create_table(
        'chat_admins',
        sa.Column('chat_id', sa.Integer(), nullable=False),
        sa.Column('admin_player_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['admin_player_id'], ['players.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chat_id'], ['tg_chats.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('chat_id', 'admin_player_id'),
        sa.UniqueConstraint('chat_id', 'admin_player_id', name='uq_chat_admins')
    )

    # Создаём таблицу chat_members
    op.create_table(
        'chat_members',
        sa.Column('chat_id', sa.Integer(), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['chat_id'], ['tg_chats.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('chat_id', 'player_id'),
        sa.UniqueConstraint('chat_id', 'player_id', name='uq_chat_members')
    )

    # Добавляем chat_id в tournaments (nullable для обратной совместимости)
    op.add_column('tournaments', sa.Column('chat_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_tournaments_chat_id'), 'tournaments', ['chat_id'], unique=False)
    op.create_foreign_key('fk_tournaments_chat_id', 'tournaments', 'tg_chats', ['chat_id'], ['id'], ondelete='CASCADE')

    # Добавляем chat_id в player_mode_stats (nullable для обратной совместимости)
    op.add_column('player_mode_stats', sa.Column('chat_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_player_mode_stats_chat_id'), 'player_mode_stats', ['chat_id'], unique=False)
    op.create_foreign_key('fk_player_mode_stats_chat_id', 'player_mode_stats', 'tg_chats', ['chat_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # Удаляем chat_id из player_mode_stats
    op.drop_constraint('fk_player_mode_stats_chat_id', 'player_mode_stats', type_='foreignkey')
    op.drop_index(op.f('ix_player_mode_stats_chat_id'), table_name='player_mode_stats')
    op.drop_column('player_mode_stats', 'chat_id')

    # Удаляем chat_id из tournaments
    op.drop_constraint('fk_tournaments_chat_id', 'tournaments', type_='foreignkey')
    op.drop_index(op.f('ix_tournaments_chat_id'), table_name='tournaments')
    op.drop_column('tournaments', 'chat_id')

    # Удаляем таблицы связей
    op.drop_table('chat_members')
    op.drop_table('chat_admins')
    op.drop_table('tg_chats')

