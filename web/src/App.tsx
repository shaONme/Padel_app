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
import ParticipantPicker from "./ParticipantPicker";

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

type View = "rating" | "createTournament" | "players" | "selectParticipants";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#d97706", // тусклый оранжевый для заголовков и акцентов
    },
    secondary: {
      main: "#b0b0b0", // светло-серый для кнопок
    },
    background: {
      default: "#2d2d2d", // темно-серый фон
      paper: "#3a3a3a", // немного светлее для карточек
    },
    text: {
      primary: "#ffffff", // белый текст для читаемости
      secondary: "#b0b0b0", // светло-серый для вторичного текста
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#b0b0b0",
          color: "#1a1a1a",
          "&:hover": {
            backgroundColor: "#c0c0c0",
          },
          "&.MuiButton-containedPrimary": {
            backgroundColor: "#d97706",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#c46900",
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1a1a1a",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#3a3a3a",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#2d2d2d",
            "& fieldset": {
              borderColor: "#555555",
            },
            "&:hover fieldset": {
              borderColor: "#d97706",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#d97706",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#b0b0b0",
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "#d97706",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: "#4a4a4a",
          color: "#ffffff",
          "&.MuiChip-clickable:hover": {
            backgroundColor: "#5a5a5a",
          },
        },
        colorPrimary: {
          backgroundColor: "#d97706",
          color: "#ffffff",
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: "#3a3a3a",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "#555555",
          color: "#ffffff",
        },
        head: {
          backgroundColor: "#2d2d2d",
          color: "#d97706",
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "#4a4a4a",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#3a3a3a",
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: "#3a3a3a",
        },
        option: {
          "&:hover": {
            backgroundColor: "#4a4a4a",
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: "#2d2d2d",
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: "#b0b0b0",
          borderColor: "#555555",
          "&.Mui-selected": {
            backgroundColor: "#d97706",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#c46900",
            },
          },
          "&:hover": {
            backgroundColor: "#4a4a4a",
          },
        },
      },
    },
  },
});

function App() {
  const [view, setView] = useState<View>("createTournament");

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
  const [selectedParticipants, setSelectedParticipants] = useState<Player[]>([]);

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

  const handleOpenParticipantsDialog = () => {
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

    setError(null);
    setView("selectParticipants");
  };

  const handleCreateTournament = async () => {
    if (selectedParticipants.length === 0) {
      setError("Выбери хотя бы одного участника");
      return;
    }

    const participantIds = selectedParticipants.map((p) => p.id);

    setCreatingTournament(true);
    setError(null);
    setTournamentResult(null);

    try {
      const requestBody = {
        name: tournamentName.trim(),
        mode: tournamentMode,
        scoring_type: scoreType,                                // "points" | "sets"
        points_limit: scoreType === "points" 
          ? (typeof pointsLimit === "number" ? pointsLimit : null) 
          : null,
        sets_limit: scoreType === "sets" 
          ? (typeof setsLimit === "number" ? setsLimit : null) 
          : null,
        participants: participantIds,                           // список ID игроков
      };

      console.log("Отправка запроса на создание турнира:", requestBody);

      const res = await fetch(`${API_URL}/tournaments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        let errorMessage = `Ошибка ${res.status}`;
        try {
          const errorData = await res.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Если не удалось распарсить JSON, используем текст ответа
          const text = await res.text();
          if (text) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }

      const data: Tournament = await res.json();
      setTournamentResult(data);
      setTournamentName("");
      setSelectedParticipants([]);
      setView("createTournament");
      // оставляем режим, тип счёта — можно по желанию чистить
    } catch (e: any) {
      console.error("Ошибка при создании турнира:", e);
      const errorMessage = e.message || "Не удалось создать турнир";
      setError(errorMessage);
    } finally {
      setCreatingTournament(false);
    }
  };


  const renderContent = () => {
    if (view === "createTournament") {
      return (
        <Box mt={3}>
          <Typography variant="h5" gutterBottom sx={{ color: "#d97706", fontWeight: 600 }}>
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
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, color: "#d97706" }}>
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
            <Typography variant="subtitle1" gutterBottom sx={{ color: "#d97706" }}>
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

              {/* Кнопка для выбора участников */}
              <Box>
                <Button
                  variant="contained"
                  onClick={handleOpenParticipantsDialog}
                  fullWidth
                  size="large"
                >
                  {selectedParticipants.length > 0 
                    ? `Выбрано участников: ${selectedParticipants.length}` 
                    : "Выбрать участников"}
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
          <Typography variant="h5" gutterBottom sx={{ color: "#d97706", fontWeight: 600 }}>
            Рейтинг игроков
          </Typography>

          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, color: "#d97706" }}>
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

    if (view === "selectParticipants") {
      return (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "background.default",
            zIndex: 1300,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              p: 2,
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ color: "#d97706", fontWeight: 600 }}>
                Выбор участников турнира
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                  <strong>Турнир:</strong> {tournamentName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Режим:</strong> {ratingModes.find(m => m.code === tournamentMode)?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Счёт:</strong> {scoreType === "points" 
                    ? `По очкам (лимит: ${pointsLimit})` 
                    : `По сетам (до ${setsLimit} сетов)`}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, overflow: "hidden", p: 3 }}>
            <ParticipantPicker
              mode={tournamentMode}
              selectedParticipants={selectedParticipants}
              onParticipantsChange={setSelectedParticipants}
              onClose={() => setView("createTournament")}
              onCreateTournament={handleCreateTournament}
              creatingTournament={creatingTournament}
              maxParticipants={20}
            />
          </Box>
        </Box>
      );
    }

    // view === "players"
    return (
      <Box mt={3}>
        <Typography variant="h5" gutterBottom sx={{ color: "#d97706", fontWeight: 600 }}>
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
        {view !== "selectParticipants" && (
          <AppBar position="static" elevation={1}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1, color: "#d97706", fontWeight: 600 }}>
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
                  variant={view === "createTournament" ? "contained" : "outlined"}
                  onClick={() => setView("createTournament")}
                  size="small"
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 2 },
                    backgroundColor: view === "createTournament" ? "#b0b0b0" : "transparent",
                    color: view === "createTournament" ? "#1a1a1a" : "#b0b0b0",
                    borderColor: "#b0b0b0",
                    "&:hover": {
                      backgroundColor: view === "createTournament" ? "#c0c0c0" : "#4a4a4a",
                      borderColor: "#c0c0c0",
                    }
                  }}
                >
                  Создать турнир
                </Button>
                <Button
                  variant={view === "rating" ? "contained" : "outlined"}
                  onClick={() => setView("rating")}
                  size="small"
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 2 },
                    backgroundColor: view === "rating" ? "#b0b0b0" : "transparent",
                    color: view === "rating" ? "#1a1a1a" : "#b0b0b0",
                    borderColor: "#b0b0b0",
                    "&:hover": {
                      backgroundColor: view === "rating" ? "#c0c0c0" : "#4a4a4a",
                      borderColor: "#c0c0c0",
                    }
                  }}
                >
                  Рейтинг
                </Button>
                <Button
                  variant={view === "players" ? "contained" : "outlined"}
                  onClick={() => setView("players")}
                  size="small"
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 2 },
                    backgroundColor: view === "players" ? "#b0b0b0" : "transparent",
                    color: view === "players" ? "#1a1a1a" : "#b0b0b0",
                    borderColor: "#b0b0b0",
                    "&:hover": {
                      backgroundColor: view === "players" ? "#c0c0c0" : "#4a4a4a",
                      borderColor: "#c0c0c0",
                    }
                  }}
                >
                  Игроки
                </Button>
              </Stack>
            </Toolbar>
          </AppBar>
        )}

        {view === "selectParticipants" ? (
          renderContent()
        ) : (
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
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
