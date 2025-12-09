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
from sqlalchemy.sql import func
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

class ScoringTypeEnum(str, Enum):
    POINTS = "points"
    SETS = "sets"


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    tg_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    display_name = Column(String, nullable=False)
    gender = Column(SAEnum(GenderEnum), nullable=True)
    current_rating = Column(Float, nullable=False, default=1500.0)
    rating_letter = Column(String(2), nullable=True)  # типа "A+", "B-", "C" и т.д.
    created_at = Column(DateTime, default=datetime.utcnow)

    stats = relationship("PlayerModeStats", back_populates="player")


class PlayerModeStats(Base):
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



# 🔹 ОБНОВЛЁННАЯ модель турнира
class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    mode = Column(SAEnum(RatingModeEnum, name="ratingmodeenum"), nullable=False)
    status = Column(String, default="draft")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    scoring_type = Column(SAEnum(ScoringTypeEnum, name="scoringtypeenum"), nullable=False)
    points_limit = Column(Integer, nullable=True)
    sets_limit = Column(Integer, nullable=True)

    participants = relationship(
        "TournamentPlayer",
        back_populates="tournament",
        cascade="all, delete-orphan",
    )
    matches = relationship(
        "TournamentMatch",
        back_populates="tournament",
        cascade="all, delete-orphan",
    )


# 🔹 НОВАЯ таблица участников турнира
class TournamentPlayer(Base):
    __tablename__ = "tournament_players"

    tournament_id = Column(
        Integer,
        ForeignKey("tournaments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    player_id = Column(
        Integer,
        ForeignKey("players.id", ondelete="CASCADE"),
        primary_key=True,
    )

    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    tournament = relationship("Tournament", back_populates="participants")
    player = relationship("Player")


# 🔹 НОВАЯ таблица матчей турнира
class TournamentMatch(Base):
    __tablename__ = "tournament_matches"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(
        Integer,
        ForeignKey("tournaments.id", ondelete="CASCADE"),
        nullable=False,
    )

    round_number = Column(Integer, nullable=True)
    court_number = Column(Integer, nullable=True)

    player1_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    player2_id = Column(Integer, ForeignKey("players.id"), nullable=False)

    score_type = Column(SAEnum(ScoringTypeEnum, name="scoringtypeenum"), nullable=False)
    points1 = Column(Integer, nullable=True)
    points2 = Column(Integer, nullable=True)
    sets1 = Column(Integer, nullable=True)
    sets2 = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tournament = relationship("Tournament", back_populates="matches")
    player1 = relationship("Player", foreign_keys=[player1_id])
    player2 = relationship("Player", foreign_keys=[player2_id])