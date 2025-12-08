from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .db import Base, engine, get_db
from .models import Player, PlayerModeStats, RatingModeEnum, Tournament, GenderEnum
from fastapi.middleware.cors import CORSMiddleware
from typing import List


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


class TournamentOut(BaseModel):
    id: int
    name: str
    mode: RatingModeEnum
    status: str

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


@app.post("/players/register", response_model=PlayerOut)
def register_player(data: PlayerCreate, db: Session = Depends(get_db)):
    # ищем игрока по tg_id
    player = db.query(Player).filter(Player.tg_id == data.tg_id).first()
    if player:
        # если существует — обновим имя/юзернейм
        player.username = data.username
        player.display_name = data.display_name
    else:
        # если нет — создаём
        player = Player(
            tg_id=data.tg_id,
            username=data.username,
            display_name=data.display_name,
        )
        db.add(player)

    db.commit()
    db.refresh(player)
    return player

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
    # Тут потом можно подставлять tg_id админа (из бота / auth),
    # пока оставим пустым.
    tournament = Tournament(
        name=payload.name,
        mode=payload.mode,
        status="draft",
    )
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament

