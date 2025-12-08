# backend/models.py
from enum import Enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from .db import Base


class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class RatingModeEnum(str, Enum):
    AM_CLASSIC = "americano_classic"
    AM_TEAM = "americano_team"
    AM_MIX = "americano_mix"
    MX_CLASSIC = "mexicano_classic"
    MX_TEAM = "mexicano_team"
    MX_MIX = "mexicano_mix"
    KING = "king_of_court"


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    tg_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    display_name = Column(String, nullable=False)

    # Новые поля
    gender = Column(SAEnum(GenderEnum), nullable=True)
    current_rating = Column(Float, nullable=False, default=1500.0)
    rating_letter = Column(String(2), nullable=True)  # типа "A+", "B-", "C" и т.д.

    created_at = Column(DateTime, default=datetime.utcnow)

    # Связь со статистикой по режимам
    stats = relationship("PlayerModeStats", back_populates="player")


class PlayerModeStats(Base):
    """
    Аггрегированная статистика игрока по каждому режиму.
    Вместо 7 отдельных таблиц – одна таблица с полем mode.
    Если тебе критично иметь отдельные таблицы – можем разнести, но так проще и гибче.
    """

    __tablename__ = "player_mode_stats"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    mode = Column(SAEnum(RatingModeEnum), nullable=False, index=True)

    # По играм
    games_played = Column(Integer, default=0)
    wins_games = Column(Integer, default=0)
    draws_games = Column(Integer, default=0)
    losses_games = Column(Integer, default=0)

    # По сетам
    wins_sets = Column(Integer, default=0)
    losses_sets = Column(Integer, default=0)

    # По очкам
    points_scored = Column(Integer, default=0)
    points_conceded = Column(Integer, default=0)

    # Разницы
    delta_points = Column(Integer, default=0)  # points_scored - points_conceded
    delta_sets = Column(Integer, default=0)    # wins_sets - losses_sets

    # Доп. поля для расчёта рейтинга (можно использовать под твой алгоритм)
    extra1 = Column(Float, default=0.0)
    extra2 = Column(Float, default=0.0)

    player = relationship("Player", back_populates="stats")


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    mode = Column(SAEnum(RatingModeEnum), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # опционально: id админа (потом можно привязать к tg_id)
    created_by_tg = Column(Integer, nullable=True)

    status = Column(String, default="draft")  # draft / active / finished
