# backend/models.py
from sqlalchemy import Column, Integer, String, DateTime, Float, func
from .db import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    tg_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String(64), nullable=True)
    display_name = Column(String(128), nullable=False)
    current_rating = Column(Float, nullable=False, default=1500.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
