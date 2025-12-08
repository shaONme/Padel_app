import { useEffect, useState } from "react";


const API_URL = import.meta.env.VITE_API_URL as string;

interface Player {
  id: number;
  tg_id: number;
  username: string | null;
  display_name: string;
  current_rating: number;
}

function App() {
  const [health, setHealth] = useState<string>("проверяем...");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(`OK (${JSON.stringify(data)})`))
      .catch((err) => {
        console.error(err);
        setHealth("Ошибка соединения с backend");
      });
  }, []);

  const loadPlayers = async () => {
    setLoadingPlayers(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/players`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data: Player[] = await res.json();
      setPlayers(data);
    } catch (e: any) {
      console.error(e);
      setError("Не удалось загрузить игроков");
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      <h1>Padel Admin / Web</h1>
      <p>
        Backend health: <b>{health}</b>
      </p>

      <section style={{ marginTop: 24 }}>
        <h2>Игроки</h2>
        <button
          onClick={loadPlayers}
          disabled={loadingPlayers}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          {loadingPlayers ? "Обновляем..." : "Обновить список"}
        </button>

        {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

        {players.length === 0 && !loadingPlayers && (
          <div>Пока нет игроков. Зарегистрируйся через /start в боте.</div>
        )}

        {players.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 8,
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 8 }}>ID</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 8 }}>Telegram ID</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 8 }}>Username</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 8 }}>Имя</th>
                <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 8 }}>Рейтинг</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{p.id}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{p.tg_id}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>
                    {p.username ? `@${p.username}` : "—"}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{p.display_name}</td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{Math.round(p.current_rating)}</td>
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
