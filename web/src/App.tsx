import { useEffect, useState } from "react";
import {
  ThemeProvider,
  createTheme,
} from "@mui/material/styles";
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Stack,
  TextField,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

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

interface Player {
  id: number;
  tg_id: number;
  username: string | null;
  display_name: string;
  gender: "male" | "female" | "other" | null;
  current_rating: number;
  rating_letter: string | null;
}

type View = "rating" | "createTournament" | "players";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    background: {
      default: "#f5f7fb",
    },
  },
});

function App() {
  const [view, setView] = useState<View>("rating");

  // режимы рейтинга
  const [ratingModes, setRatingModes] = useState<RatingMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<RatingModeCode | null>(null);
  const [ratingTable, setRatingTable] = useState<PlayerRow[]>([]);
  const [loadingRating, setLoadingRating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // создание турнира
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentMode, setTournamentMode] = useState<RatingModeCode | null>(null);
  const [tournamentResult, setTournamentResult] = useState<Tournament | null>(null);
  const [creatingTournament, setCreatingTournament] = useState(false);

  // счёт турнира
  const [scoreType, setScoreType] = useState<"points" | "sets">("points");
  const [pointsLimit, setPointsLimit] = useState<number | "">(16);
  const [setsLimit, setSetsLimit] = useState<number | "">(1);

  // просмотр игроков
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    // подгружаем режимы рейтинга
    fetch(`${API_URL}/rating/modes`)
      .then((res) => res.json())
      .then((data: RatingMode[]) => {
        setRatingModes(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // подгрузка таблицы рейтинга
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

  // подгрузка списка игроков
  const loadPlayers = async () => {
    setLoadingPlayers(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/players`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: Player[] = await res.json();
      setPlayers(data);
    } catch (e: any) {
      console.error(e);
      setError("Не удалось загрузить список игроков");
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  // когда переключаемся на экран игроков — грузим список
  useEffect(() => {
    if (view === "players") {
      loadPlayers();
    }
  }, [view]);

  const handleCreateTournament = async () => {
    if (!tournamentName.trim() || !tournamentMode) {
      setError("Укажи имя турнира и режим");
      return;
    }

    // пока scoreType / pointsLimit / setsLimit никуда не отправляем,
    // чтобы не ломать backend. Можно будет позже добавить в TournamentCreate.
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
          scoring_type: scoreType,                                // "points" | "sets"
          points_limit: scoreType === "points" ? pointsLimit || null : null,
          sets_limit: scoreType === "sets" ? setsLimit || null : null,
          participants: [],                                       // позже сюда добавим список ID игроков
        }),
      });


      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: Tournament = await res.json();
      setTournamentResult(data);
      setTournamentName("");
    } catch (e: any) {
      console.error(e);
      setError("Не удалось создать турнир");
    } finally {
      setCreatingTournament(false);
    }
  };

  const renderContent = () => {
    if (view === "createTournament") {
      return (
        <Box mt={3}>
          <Typography variant="h5" gutterBottom>
            Создать турнир
          </Typography>

          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <TextField
                label="Название турнира"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Например: Найскок 21.12"
                fullWidth
              />

              {/* Выбор режима турнира */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Режим:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {ratingModes.map((mode) => (
                    <Chip
                      key={mode.code}
                      label={mode.name}
                      clickable
                      onClick={() => setTournamentMode(mode.code)}
                      color={tournamentMode === mode.code ? "primary" : "default"}
                      variant={tournamentMode === mode.code ? "filled" : "outlined"}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* Блок выбора счёта */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Счёт в турнире
                </Typography>

                <Box mb={2}>
                  <ToggleButtonGroup
                    exclusive
                    value={scoreType}
                    onChange={(_, val) => {
                      if (val === null) return;
                      setScoreType(val);
                    }}
                    size="small"
                  >
                    <ToggleButton value="points">По очкам</ToggleButton>
                    <ToggleButton value="sets">По сетам</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {scoreType === "points" && (
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2">Лимит очков:</Typography>
                    <Stack direction="row" spacing={1}>
                      {[16, 24, 32].map((val) => (
                        <Chip
                          key={val}
                          label={val}
                          clickable
                          onClick={() => setPointsLimit(val)}
                          color={pointsLimit === val ? "primary" : "default"}
                          variant={pointsLimit === val ? "filled" : "outlined"}
                        />
                      ))}
                    </Stack>
                    <TextField
                      label="Своё значение"
                      type="number"
                      size="small"
                      value={pointsLimit === "" ? "" : pointsLimit}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          setPointsLimit("");
                        } else {
                          setPointsLimit(Number(v));
                        }
                      }}
                      sx={{ width: 120 }}
                    />
                  </Stack>
                )}

                {scoreType === "sets" && (
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2">До скольки сетов:</Typography>
                    <Stack direction="row" spacing={1}>
                      {[1, 3, 5].map((val) => (
                        <Chip
                          key={val}
                          label={val}
                          clickable
                          onClick={() => setSetsLimit(val)}
                          color={setsLimit === val ? "primary" : "default"}
                          variant={setsLimit === val ? "filled" : "outlined"}
                        />
                      ))}
                    </Stack>
                    <TextField
                      label="Своё значение"
                      type="number"
                      size="small"
                      value={setsLimit === "" ? "" : setsLimit}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          setSetsLimit("");
                        } else {
                          setSetsLimit(Number(v));
                        }
                      }}
                      sx={{ width: 120 }}
                    />
                  </Stack>
                )}
              </Box>

              <Box>
                <Button
                  variant="contained"
                  onClick={handleCreateTournament}
                  disabled={creatingTournament}
                >
                  {creatingTournament ? "Создаём..." : "Создать турнир"}
                </Button>
              </Box>

              {tournamentResult && (
                <Alert severity="success">
                  Турнир создан: #{tournamentResult.id} — {tournamentResult.name} (
                  {tournamentResult.mode})
                </Alert>
              )}
            </Stack>
          </Paper>
        </Box>
      );
    }

    if (view === "rating") {
      return (
        <Box mt={3}>
          <Typography variant="h5" gutterBottom>
            Рейтинг игроков
          </Typography>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Режим:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {ratingModes.map((mode) => (
                <Chip
                  key={mode.code}
                  label={mode.name}
                  clickable
                  onClick={() => loadRating(mode.code)}
                  color={selectedMode === mode.code ? "primary" : "default"}
                  variant={selectedMode === mode.code ? "filled" : "outlined"}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Paper>

          {loadingRating && (
            <Box display="flex" justifyContent="center" mt={4}>
              <CircularProgress />
            </Box>
          )}

          {!loadingRating && selectedMode && ratingTable.length === 0 && (
            <Alert severity="info">По этому режиму пока нет данных.</Alert>
          )}

          {!loadingRating && ratingTable.length > 0 && (
            <Paper sx={{ p: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Игрок</TableCell>
                    <TableCell>Рейтинг</TableCell>
                    <TableCell>Буква</TableCell>
                    <TableCell>Игры (В/Н/П)</TableCell>
                    <TableCell>Сеты (В/П, Δ)</TableCell>
                    <TableCell>Очки (+/-)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ratingTable.map((row, idx) => (
                    <TableRow key={row.player_id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        {row.display_name}
                        {row.username && (
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ color: "text.secondary", ml: 0.5 }}
                          >
                            @{row.username}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{Math.round(row.current_rating)}</TableCell>
                      <TableCell>{row.rating_letter ?? "—"}</TableCell>
                      <TableCell>
                        {row.games_played} ({row.wins_games}/{row.draws_games}/
                        {row.losses_games})
                      </TableCell>
                      <TableCell>
                        {row.wins_sets}/{row.losses_sets} (
                        {row.delta_sets >= 0 ? "+" : ""}
                        {row.delta_sets})
                      </TableCell>
                      <TableCell>
                        {row.points_scored}/{row.points_conceded} (
                        {row.delta_points >= 0 ? "+" : ""}
                        {row.delta_points})
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
      );
    }

    // view === "players"
    return (
      <Box mt={3}>
        <Typography variant="h5" gutterBottom>
          Игроки
        </Typography>

        {loadingPlayers && (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        )}

        {!loadingPlayers && players.length === 0 && (
          <Alert severity="info">Пока нет игроков.</Alert>
        )}

        {!loadingPlayers && players.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Имя</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Пол</TableCell>
                  <TableCell>Рейтинг</TableCell>
                  <TableCell>Буква</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{p.display_name}</TableCell>
                    <TableCell>{p.username ? `@${p.username}` : "—"}</TableCell>
                    <TableCell>
                      {p.gender === "male"
                        ? "М"
                        : p.gender === "female"
                        ? "Ж"
                        : p.gender === "other"
                        ? "Другое"
                        : "—"}
                    </TableCell>
                    <TableCell>{Math.round(p.current_rating)}</TableCell>
                    <TableCell>{p.rating_letter ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Padel Admin
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                color="inherit"
                variant={view === "createTournament" ? "outlined" : "text"}
                onClick={() => setView("createTournament")}
              >
                Создать турнир
              </Button>
              <Button
                color="inherit"
                variant={view === "rating" ? "outlined" : "text"}
                onClick={() => setView("rating")}
              >
                Посмотреть рейтинг
              </Button>
              <Button
                color="inherit"
                variant={view === "players" ? "outlined" : "text"}
                onClick={() => setView("players")}
              >
                Просмотр игроков
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
          {error && (
            <Box mb={2}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}

          {renderContent()}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
