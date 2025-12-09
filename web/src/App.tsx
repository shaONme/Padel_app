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
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

// Определяем URL API с fallback на локальный для разработки
const API_URL = 
  import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? "http://localhost:8000" : "https://padel-app-go6s.onrender.com");

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
  created_at: string;
  scoring_type: "points" | "sets";
  points_limit: number | null;
  sets_limit: number | null;
  participants: number[];
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

  // участники турнира
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantOptions, setParticipantOptions] = useState<Player[]>([]);
  const [participantLoading, setParticipantLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Player[]>([]);
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);

  // просмотр игроков (общий список)
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // подгружаем режимы рейтинга при старте
  useEffect(() => {
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

  // подгрузка списка игроков для экрана "Игроки"
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

  // поиск игроков для автодополнения участников
  useEffect(() => {
    const q = participantQuery.trim();
    if (!q) {
      setParticipantOptions([]);
      return;
    }

    let cancelled = false;
    setParticipantLoading(true);

    fetch(`${API_URL}/players/search?q=${encodeURIComponent(q)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: Player[]) => {
        if (!cancelled) {
          setParticipantOptions(data);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setParticipantOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setParticipantLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [participantQuery]);

  const handleCreateTournament = async () => {
    if (!tournamentName.trim() || !tournamentMode) {
      setError("Укажи имя турнира и режим");
      return;
    }

    if (scoreType === "points" && (!pointsLimit || pointsLimit <= 0)) {
      setError("Укажи корректный лимит очков");
      return;
    }

    if (scoreType === "sets" && (!setsLimit || setsLimit <= 0)) {
      setError("Укажи корректный лимит сетов");
      return;
    }

    const participantIds = selectedParticipants.map((p) => p.id);

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
          participants: participantIds,                           // список ID игроков
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: Tournament = await res.json();
      setTournamentResult(data);
      setTournamentName("");
      setParticipantsDialogOpen(false);
      // оставляем режим, тип счёта и участников — можно по желанию чистить
    } catch (e: any) {
      console.error(e);
      setError("Не удалось создать турнир");
    } finally {
      setCreatingTournament(false);
    }
  };

  const formatPlayerLabel = (p: Player) => {
    const parts = [p.display_name];
    if (p.username) parts.push(`@${p.username}`);
    parts.push(`tg:${p.tg_id}`);
    return parts.join(" · ");
  };

  const renderContent = () => {
    if (view === "createTournament") {
      return (
        <Box mt={3}>
          <Typography variant="h5" gutterBottom>
            Создать турнир
          </Typography>

          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                  Режим:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {ratingModes.map((mode) => (
                    <Chip
                      key={mode.code}
                      label={mode.name}
                      clickable
                      onClick={() => {
                        setTournamentMode(mode.code);
                        // Открываем модальное окно выбора участников после выбора режима
                        setParticipantsDialogOpen(true);
                      }}
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
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2} 
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexWrap="wrap"
                  >
                    <Typography variant="body2" sx={{ minWidth: 'fit-content' }}>
                      Лимит очков:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                      sx={{ width: { xs: '100%', sm: 120 } }}
                    />
                  </Stack>
                )}

                {scoreType === "sets" && (
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2} 
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    flexWrap="wrap"
                  >
                    <Typography variant="body2" sx={{ minWidth: 'fit-content' }}>
                      До скольки сетов:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                      sx={{ width: { xs: '100%', sm: 120 } }}
                    />
                  </Stack>
                )}
              </Box>

              {/* Информация о выбранных участниках */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Участники турнира
                </Typography>
                {selectedParticipants.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Выберите режим турнира, чтобы добавить участников
                  </Alert>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Выбрано участников: {selectedParticipants.length}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                      {selectedParticipants.map((p) => (
                        <Chip
                          key={p.id}
                          label={p.display_name}
                          onDelete={() =>
                            setSelectedParticipants((prev) =>
                              prev.filter((x) => x.id !== p.id)
                            )
                          }
                          size="small"
                        />
                      ))}
                    </Stack>
                    <Button
                      variant="outlined"
                      onClick={() => setParticipantsDialogOpen(true)}
                      size="small"
                    >
                      Изменить участников
                    </Button>
                  </Box>
                )}
              </Box>

              <Box>
                <Button
                  variant="contained"
                  onClick={handleCreateTournament}
                  disabled={creatingTournament || selectedParticipants.length === 0 || !tournamentMode}
                  size="large"
                  fullWidth
                >
                  {creatingTournament ? "Создаём..." : "Создать турнир"}
                </Button>
                {selectedParticipants.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Выберите участников для создания турнира
                  </Typography>
                )}
              </Box>

              {tournamentResult && (
                <Alert severity="success">
                  Турнир создан: #{tournamentResult.id} — {tournamentResult.name} (
                  {tournamentResult.mode})
                </Alert>
              )}
            </Stack>
          </Paper>

          {/* Модальное окно выбора участников */}
          <Dialog
            open={participantsDialogOpen}
            onClose={() => setParticipantsDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Выбор участников турнира</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Autocomplete
                  multiple
                  options={participantOptions}
                  value={selectedParticipants}
                  loading={participantLoading}
                  getOptionLabel={(option) => formatPlayerLabel(option)}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(x) => x} // отключаем внутренний фильтр, всё делает бэк
                  onChange={(_, value) => setSelectedParticipants(value)}
                  onInputChange={(_, value) => {
                    setParticipantQuery(value);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Добавить игроков"
                      placeholder="Начни вводить имя / @username / tg_id"
                      helperText="Игроки берутся из зарегистрированных (ботом / ранее добавленных)"
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {formatPlayerLabel(option)}
                    </li>
                  )}
                  noOptionsText={
                    participantQuery.trim()
                      ? "Ничего не найдено"
                      : "Начни вводить имя или @username"
                  }
                />

                {selectedParticipants.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Выбрано: {selectedParticipants.length}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedParticipants.map((p) => (
                        <Chip
                          key={p.id}
                          label={p.display_name}
                          onDelete={() =>
                            setSelectedParticipants((prev) =>
                              prev.filter((x) => x.id !== p.id)
                            )
                          }
                          size="small"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setParticipantsDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={() => setParticipantsDialogOpen(false)}
                variant="contained"
                disabled={selectedParticipants.length === 0}
              >
                Готово ({selectedParticipants.length})
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    }

    if (view === "rating") {
      return (
        <Box mt={3}>
          <Typography variant="h5" gutterBottom>
            Рейтинг игроков
          </Typography>

          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
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
            <Paper sx={{ p: { xs: 1, sm: 2 }, overflow: 'auto' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Игрок</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Рейтинг</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Буква</TableCell>
                      <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>
                        Игры (В/Н/П)
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Сеты (В/П, Δ)</TableCell>
                      <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>
                        Очки (+/-)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ratingTable.map((row, idx) => (
                      <TableRow key={row.player_id} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                              {row.display_name}
                            </Typography>
                            {row.username && (
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{ color: "text.secondary", ml: 0.5, display: { xs: 'none', sm: 'inline' } }}
                              >
                                @{row.username}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {Math.round(row.current_rating)}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.rating_letter ?? "—"}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {row.games_played} ({row.wins_games}/{row.draws_games}/{row.losses_games})
                        </TableCell>
                        <TableCell>
                          {row.wins_sets}/{row.losses_sets} ({row.delta_sets >= 0 ? "+" : ""}
                          {row.delta_sets})
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          {row.points_scored}/{row.points_conceded} ({row.delta_points >= 0 ? "+" : ""}
                          {row.delta_points})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
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
          <Paper sx={{ p: { xs: 1, sm: 2 }, overflow: 'auto' }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 500 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Имя</TableCell>
                    <TableCell sx={{ fontWeight: 600, display: { xs: 'none', sm: 'table-cell' } }}>
                      Username
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Пол</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Рейтинг</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Буква</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {players.map((p, idx) => (
                    <TableRow key={p.id} hover>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {p.display_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {p.username ? `@${p.username}` : "—"}
                      </TableCell>
                      <TableCell>
                        {p.gender === "male"
                          ? "М"
                          : p.gender === "female"
                          ? "Ж"
                          : p.gender === "other"
                          ? "Другое"
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {Math.round(p.current_rating)}
                        </Typography>
                      </TableCell>
                      <TableCell>{p.rating_letter ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
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

            <Stack 
              direction="row" 
              spacing={1}
              sx={{
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: { xs: 0.5, sm: 1 }
              }}
            >
              <Button
                color="inherit"
                variant={view === "createTournament" ? "outlined" : "text"}
                onClick={() => setView("createTournament")}
                size="small"
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 }
                }}
              >
                Создать турнир
              </Button>
              <Button
                color="inherit"
                variant={view === "rating" ? "outlined" : "text"}
                onClick={() => setView("rating")}
                size="small"
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 }
                }}
              >
                Рейтинг
              </Button>
              <Button
                color="inherit"
                variant={view === "players" ? "outlined" : "text"}
                onClick={() => setView("players")}
                size="small"
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 }
                }}
              >
                Игроки
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container 
          maxWidth="lg" 
          sx={{ 
            mt: { xs: 2, sm: 3 }, 
            mb: { xs: 2, sm: 4 },
            px: { xs: 1, sm: 2 }
          }}
        >
          {error && (
            <Box mb={2}>
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </Box>
          )}

          {renderContent()}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
