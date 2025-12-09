from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .db import Base, engine, get_db
from .models import (
    Player,
    PlayerModeStats,
    RatingModeEnum,
    Tournament,
    GenderEnum,
    ScoringTypeEnum,
    TournamentPlayer,
    TournamentMatch,
)
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime
from fastapi import Query
from sqlalchemy import or_, String, cast

# создаём таблицы в БД (players и т.д.)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Padel Backend API")

# Разрешаем запросы с фронта (Vite по умолчанию 5173 порт)
origins = [
    "https://paddleapp.netlify.app",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class PlayerCreate(BaseModel):
    tg_id: int
    username: str | None = None
    display_name: str


class PlayerOut(BaseModel):
    id: int
    tg_id: int
    username: str | None
    display_name: str
    gender: GenderEnum | None
    current_rating: float
    rating_letter: str | None

    class Config:
        orm_mode = True


class PlayerListOut(BaseModel):
    id: int
    tg_id: int
    username: str | None
    display_name: str
    gender: GenderEnum | None
    current_rating: float
    rating_letter: str | None

    class Config:
        orm_mode = True

class RatingModeOut(BaseModel):
    code: RatingModeEnum
    name: str


class PlayerRatingRow(BaseModel):
    player_id: int
    display_name: str
    username: str | None
    gender: GenderEnum | None
    current_rating: float
    rating_letter: str | None

    games_played: int
    wins_games: int
    draws_games: int
    losses_games: int
    wins_sets: int
    losses_sets: int
    points_scored: int
    points_conceded: int
    delta_points: int
    delta_sets: int

    class Config:
        orm_mode = True



class TournamentCreate(BaseModel):
    name: str
    mode: RatingModeEnum
    scoring_type: ScoringTypeEnum
    points_limit: Optional[int] = None
    sets_limit: Optional[int] = None
    participants: List[int] = []  # список ID игроков


class TournamentOut(BaseModel):
    id: int
    name: str
    mode: RatingModeEnum
    status: str
    created_at: datetime
    scoring_type: ScoringTypeEnum
    points_limit: Optional[int]
    sets_limit: Optional[int]
    participants: List[int]

    class Config:
        orm_mode = True


class MatchCreate(BaseModel):
    tournament_id: int
    round_number: Optional[int] = None
    court_number: Optional[int] = None

    player1_id: int
    player2_id: int

    score_type: ScoringTypeEnum
    points1: Optional[int] = None
    points2: Optional[int] = None
    sets1: Optional[int] = None
    sets2: Optional[int] = None


class MatchOut(BaseModel):
    id: int
    tournament_id: int
    round_number: Optional[int]
    court_number: Optional[int]
    player1_id: int
    player2_id: int
    score_type: ScoringTypeEnum
    points1: Optional[int]
    points2: Optional[int]
    sets1: Optional[int]
    sets2: Optional[int]
    created_at: datetime

    class Config:
        orm_mode = True

MODE_LABELS = {
    RatingModeEnum.AM_CLASSIC: "Americano classic",
    RatingModeEnum.AM_TEAM: "Americano team",
    RatingModeEnum.AM_MIX: "Americano mix",
    RatingModeEnum.MX_CLASSIC: "Mexicano classic",
    RatingModeEnum.MX_TEAM: "Mexicano team",
    RatingModeEnum.MX_MIX: "Mexicano mix",
    RatingModeEnum.KING: "Царь корта",
}



@app.get("/health")
def health():
    return {"status": "ok"}


from sqlalchemy.exc import SQLAlchemyError

@app.post("/players/register", response_model=PlayerOut)
def register_player(data: PlayerCreate, db: Session = Depends(get_db)):
    try:
        player = db.query(Player).filter(Player.tg_id == data.tg_id).first()
        if player:
            player.username = data.username
            player.display_name = data.display_name
        else:
            player = Player(
                tg_id=data.tg_id,
                username=data.username,
                display_name=data.display_name,
            )
            db.add(player)

        db.commit()
        db.refresh(player)
        return player
    except SQLAlchemyError as e:
        db.rollback()
        print("DB ERROR in /players/register:", repr(e))  # уйдёт в логи Render
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/players/by_tg/{tg_id}", response_model=PlayerOut)
def get_player_by_tg(tg_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.tg_id == tg_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@app.get("/players", response_model=List[PlayerListOut])
def list_players(db: Session = Depends(get_db)):
    players = (
        db.query(Player)
        .order_by(Player.current_rating.desc(), Player.id.asc())
        .all()
    )
    return players

@app.get("/players/search", response_model=List[PlayerOut])
def search_players(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """
    Поиск игроков по имени, username или tg_id (частичное совпадение).
    """
    pattern = f"%{q}%"
    players = (
        db.query(Player)
        .filter(
            or_(
                Player.display_name.ilike(pattern),
                Player.username.ilike(pattern),
                cast(Player.tg_id, String).ilike(pattern),
            )
        )
        .order_by(Player.display_name.asc())
        .limit(20)
        .all()
    )
    return players


@app.get("/rating/modes", response_model=List[RatingModeOut])
def list_rating_modes():
    return [
        RatingModeOut(code=mode, name=MODE_LABELS[mode])
        for mode in RatingModeEnum
    ]

@app.get("/rating/{mode}", response_model=List[PlayerRatingRow])
def get_rating_table(mode: RatingModeEnum, db: Session = Depends(get_db)):
    """
    Таблица рейтинга для выбранного режима.
    Сейчас сортируем по current_rating и delta_points.
    Позже сюда можно вставить твой реальный алгоритм расчёта и буквы рейтинга.
    """
    # join Player + PlayerModeStats
    q = (
        db.query(Player, PlayerModeStats)
        .join(PlayerModeStats, PlayerModeStats.player_id == Player.id)
        .filter(PlayerModeStats.mode == mode)
        .order_by(Player.current_rating.desc(), PlayerModeStats.delta_points.desc())
    )

    rows: List[PlayerRatingRow] = []
    for player, stats in q.all():
        rows.append(
            PlayerRatingRow(
                player_id=player.id,
                display_name=player.display_name,
                username=player.username,
                gender=player.gender,
                current_rating=player.current_rating,
                rating_letter=player.rating_letter,
                games_played=stats.games_played,
                wins_games=stats.wins_games,
                draws_games=stats.draws_games,
                losses_games=stats.losses_games,
                wins_sets=stats.wins_sets,
                losses_sets=stats.losses_sets,
                points_scored=stats.points_scored,
                points_conceded=stats.points_conceded,
                delta_points=stats.delta_points,
                delta_sets=stats.delta_sets,
            )
        )
    return rows

@app.post("/tournaments", response_model=TournamentOut)
def create_tournament(payload: TournamentCreate, db: Session = Depends(get_db)):
    # базовая валидация лимитов
    if payload.scoring_type == ScoringTypeEnum.POINTS:
        if payload.points_limit is None or payload.points_limit <= 0:
            raise HTTPException(status_code=400, detail="Нужно указать положительный points_limit")
    if payload.scoring_type == ScoringTypeEnum.SETS:
        if payload.sets_limit is None or payload.sets_limit <= 0:
            raise HTTPException(status_code=400, detail="Нужно указать положительный sets_limit")

    tournament = Tournament(
        name=payload.name,
        mode=payload.mode,
        status="draft",
        scoring_type=payload.scoring_type,
        points_limit=payload.points_limit if payload.scoring_type == ScoringTypeEnum.POINTS else None,
        sets_limit=payload.sets_limit if payload.scoring_type == ScoringTypeEnum.SETS else None,
    )
    db.add(tournament)
    db.flush()  # получаем tournament.id без commit

    # создаём связки участников, если передали
    participant_ids: List[int] = payload.participants or []
    for pid in participant_ids:
        # можно проверить, что такой игрок существует
        # player = db.get(Player, pid)
        # if not player: continue / ошибка
        tp = TournamentPlayer(
            tournament_id=tournament.id,
            player_id=pid,
        )
        db.add(tp)

    db.commit()
    db.refresh(tournament)

    # собираем список id участников для ответа
    participants_ids = [tp.player_id for tp in tournament.participants]

    return TournamentOut(
        id=tournament.id,
        name=tournament.name,
        mode=tournament.mode,
        status=tournament.status,
        created_at=tournament.created_at,
        scoring_type=tournament.scoring_type,
        points_limit=tournament.points_limit,
        sets_limit=tournament.sets_limit,
        participants=participants_ids,
    )

@app.post("/matches", response_model=MatchOut)
def create_match(payload: MatchCreate, db: Session = Depends(get_db)):
    # простая валидация под тип счёта
    if payload.score_type == ScoringTypeEnum.POINTS:
        if payload.points1 is None or payload.points2 is None:
            raise HTTPException(status_code=400, detail="Для score_type=points нужно указать points1/points2")
    if payload.score_type == ScoringTypeEnum.SETS:
        if payload.sets1 is None or payload.sets2 is None:
            raise HTTPException(status_code=400, detail="Для score_type=sets нужно указать sets1/sets2")

    match = TournamentMatch(
        tournament_id=payload.tournament_id,
        round_number=payload.round_number,
        court_number=payload.court_number,
        player1_id=payload.player1_id,
        player2_id=payload.player2_id,
        score_type=payload.score_type,
        points1=payload.points1,
        points2=payload.points2,
        sets1=payload.sets1,
        sets2=payload.sets2,
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match

