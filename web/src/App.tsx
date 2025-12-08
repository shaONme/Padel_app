import React, { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL as string;

interface PlayerRow {
  player_id: number;
  display_name: string;
  username: string | null;
  gender: "male" | "female" | "other" | null;
  current_rating: number;
  rating_letter: string | null;
  games_played: number;
  wins_games: number;
  draws_games: number;
  losses_games: number;
  wins_sets: number;
  losses_sets: number;
  points_scored: number;
  points_conceded: number;
  delta_points: number;
  delta_sets: number;
}

type RatingModeCode =
  | "americano_classic"
  | "americano_team"
  | "americano_mix"
  | "mexicano_classic"
  | "mexicano_team"
  | "mexicano_mix"
  | "king_of_court";

interface RatingMode {
  code: RatingModeCode;
  name: string;
}

interface Tournament {
  id: number;
  name: string;
  mode: RatingModeCode;
  status: string;
}

function App() {
  const [health, setHealth] = useState<string>("проверяем...");
  const [ratingModes, setRatingModes] = useState<RatingMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<RatingModeCode | null>(null);
  const [ratingTable, setRatingTable] = useState<PlayerRow[]>([]);
  const [loadingRating, setLoadingRating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // для создания турнира
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentMode, setTournamentMode] = useState<RatingModeCode | null>(null);
  const [tournamentResult, setTournamentResult] = useState<Tournament | null>(null);
  const [creatingTournament, setCreatingTournament] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(`OK (${JSON.stringify(data)})`))
      .catch(() => setHealth("Ошибка соединения с backend"));

    fetch(`${API_URL}/rating/modes`)
      .then((res) => res.json())
      .then((data: RatingMode[]) => {
        setRatingModes(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const loadRating = async (mode: RatingModeCode) => {
    setSelectedMode(mode);
    setLoadingRating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/rating/${mode}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: PlayerRow[] = await res.json();
      setRatingTable(data);
    } catch (e: any) {
      console.error(e);
      setError("Не удалось загрузить рейтинг");
      setRatingTable([]);
    } finally {
      setLoadingRating(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!tournamentName.trim() || !tournamentMode) {
      setError("Укажи имя турнира и режим");
      return;
    }
    setCreatingTournament(true);
    setError(null);
    setTournamentResult(null);

    try {
      const res = await fetch(`${API_URL}/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tournamentName.trim(),
          mode: tournamentMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: Tournament = await res.json();
      setTournamentResult(data);
      setTournamentName("");
      // tournamentMode оставим выделенным
    } catch (e: any) {
      console.error(e);
      setError("Не удалось создать турнир");
    } finally {
      setCreatingTournament(false);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1>Padel Admin</h1>
      <p>
        Backend health: <b>{health}</b>
      </p>

      <div style={{ display: "flex", gap: 16, marginTop: 16, marginBottom: 16 }}>
        <button
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
          onClick={() => {
            // просто фокусируемся на блоке создания турнира
            document.getElementById("create-tournament")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Создать турнир
        </button>

        <button
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
          onClick={() => {
            document.getElementById("rating-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Посмотреть рейтинг
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      {/* Блок создания турнира */}
      <section id="create-tournament" style={{ marginTop: 32, marginBottom: 40 }}>
        <h2>Создать турнир</h2>
        <div style={{ marginBottom: 12 }}>
          <label>
            Название турнира:
            <input
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              style={{ marginLeft: 8, padding: 4, minWidth: 260 }}
              placeholder="Например: Найскок 21.12"
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>Режим:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ratingModes.map((mode) => (
              <button
                key={mode.code}
                type="button"
                onClick={() => setTournamentMode(mode.code)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: tournamentMode === mode.code ? "2px solid #007bff" : "1px solid #ccc",
                  background: tournamentMode === mode.code ? "#e6f0ff" : "white",
                  cursor: "pointer",
                }}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreateTournament}
          disabled={creatingTournament}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          {creatingTournament ? "Создаём..." : "Создать турнир"}
        </button>

        {tournamentResult && (
          <div style={{ marginTop: 12, color: "green" }}>
            Турнир создан: #{tournamentResult.id} — {tournamentResult.name} ({tournamentResult.mode})
          </div>
        )}
      </section>

      {/* Блок рейтинга */}
      <section id="rating-section" style={{ marginTop: 32 }}>
        <h2>Рейтинг игроков</h2>

        <div style={{ marginBottom: 12 }}>
          <span style={{ marginRight: 8 }}>Выбери режим:</span>
          {ratingModes.map((mode) => (
            <button
              key={mode.code}
              type="button"
              onClick={() => loadRating(mode.code)}
              style={{
                marginRight: 6,
                marginBottom: 6,
                padding: "6px 10px",
                borderRadius: 6,
                border: selectedMode === mode.code ? "2px solid #007bff" : "1px solid #ccc",
                background: selectedMode === mode.code ? "#e6f0ff" : "white",
                cursor: "pointer",
              }}
            >
              {mode.name}
            </button>
          ))}
        </div>

        {loadingRating && <div>Загружаем рейтинг...</div>}

        {!loadingRating && selectedMode && ratingTable.length === 0 && (
          <div>По этому режиму пока нет данных.</div>
        )}

        {!loadingRating && ratingTable.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 12,
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}>#</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}>Игрок</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}>Рейтинг</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}>Буква</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}>Игры (В/Н/П)</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}>Сеты (В/П)</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 6 }}>Очки (+/-)</th>
              </tr>
            </thead>
            <tbody>
              {ratingTable.map((row, idx) => (
                <tr key={row.player_id}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}>{idx + 1}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}>
                    {row.display_name}
                    {row.username && (
                      <span style={{ color: "#888", marginLeft: 4 }}>@{row.username}</span>
                    )}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}>
                    {Math.round(row.current_rating)}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}>
                    {row.rating_letter ?? "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}>
                    {row.games_played} ({row.wins_games}/{row.draws_games}/{row.losses_games})
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}>
                    {row.wins_sets}/{row.losses_sets} ({row.delta_sets >= 0 ? "+" : ""}
                    {row.delta_sets})
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 6 }}>
                    {row.points_scored}/{row.points_conceded} ({row.delta_points >= 0 ? "+" : ""}
                    {row.delta_points})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default App;
