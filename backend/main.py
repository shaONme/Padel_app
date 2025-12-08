from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .db import Base, engine, get_db
from .models import Player
from fastapi.middleware.cors import CORSMiddleware
from typing import List


# создаём таблицы в БД (players и т.д.)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Padel Backend API")

# Разрешаем запросы с фронта (Vite по умолчанию 5173 порт)
origins = [
    "https://paddleapp.netlify.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
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
    current_rating: float

    class Config:
        orm_mode = True

class PlayerListOut(BaseModel):
    id: int
    tg_id: int
    username: str | None
    display_name: str
    current_rating: float

    class Config:
        orm_mode = True



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
