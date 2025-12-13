import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Chip,
  Button,
  Stack,
  Tabs,
  Tab,
  IconButton,
  Card,
  CardContent,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Check as CheckIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const API_URL = import.meta.env.VITE_API_URL as string;

interface Player {
  id: number;
  tg_id: number;
  username: string | null;
  display_name: string;
  gender: "male" | "female" | "other" | null;
  current_rating: number;
  rating_letter: string | null;
}

interface ParticipantPickerProps {
  mode: string | null;
  selectedParticipants: Player[];
  onParticipantsChange: (participants: Player[]) => void;
  onClose: () => void;
  onCreateTournament: () => void;
  creatingTournament: boolean;
  maxParticipants?: number;
}

type TabType = "frequent" | "recent" | "favorites" | "all";

function PlayerCard({
  player,
  isSelected,
  onToggle,
  isDragging = false,
  draggable = true,
}: {
  player: Player;
  isSelected: boolean;
  onToggle: () => void;
  isDragging?: boolean;
  draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: player.id.toString(),
    disabled: !draggable || isDragging,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const genderIcon = player.gender === "male" ? "♂" : player.gender === "female" ? "♀" : "";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(draggable && !isSelected ? { ...attributes, ...listeners } : {})}
      sx={{
        cursor: isSelected ? "default" : draggable ? "grab" : "pointer",
        mb: 1,
        "&:hover": {
          boxShadow: 3,
        },
        border: isSelected ? "2px solid" : "1px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        bgcolor: isSelected ? "action.selected" : "background.paper",
      }}
      onClick={!isSelected ? onToggle : undefined}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {player.display_name}
              </Typography>
              {genderIcon && (
                <Typography variant="body2" color="text.secondary">
                  {genderIcon}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
              <Chip
                label={Math.round(player.current_rating)}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
              {player.rating_letter && (
                <Chip
                  label={player.rating_letter}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              )}
              {player.username && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  @{player.username}
                </Typography>
              )}
            </Stack>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            color={isSelected ? "primary" : "default"}
            sx={{ ml: 1 }}
          >
            {isSelected ? <CheckIcon /> : <AddIcon />}
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SelectedChip({ player, onRemove }: { player: Player; onRemove: () => void }) {
  return (
    <Chip
      label={player.display_name}
      onDelete={onRemove}
      size="small"
      sx={{ m: 0.5 }}
      color="primary"
      variant="filled"
    />
  );
}

function DroppableArea({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 100,
        border: isOver ? "2px dashed" : "none",
        borderColor: isOver ? "primary.main" : "transparent",
        borderRadius: 1,
        bgcolor: isOver ? "action.hover" : "transparent",
        transition: "all 0.2s",
      }}
    >
      {children}
    </Box>
  );
}

export default function ParticipantPicker({
  mode: _mode, // TODO: использовать для фильтрации по режиму турнира (Частые, Последние)
  selectedParticipants,
  onParticipantsChange,
  onClose,
  onCreateTournament,
  creatingTournament,
  maxParticipants = 20,
}: ParticipantPickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Загрузка всех игроков
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/players`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Player[]) => {
        setAllPlayers(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Не удалось загрузить список игроков");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Фильтрация игроков по поиску
  const filteredPlayers = useMemo(() => {
    let players = allPlayers;

    // Фильтр по поиску
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      players = players.filter(
        (p) =>
          p.display_name.toLowerCase().includes(query) ||
          p.username?.toLowerCase().includes(query) ||
          p.tg_id.toString().includes(query)
      );
    }

    // Фильтр по табам (пока упрощённо - все табы показывают всех)
    // TODO: Реализовать логику для "Частые", "Последние", "Избранные"
    if (activeTab === "favorites") {
      // Пока пусто - будет реализовано позже
      players = [];
    }

    // Исключаем уже выбранных
    const selectedIds = new Set(selectedParticipants.map((p) => p.id));
    return players.filter((p) => !selectedIds.has(p.id));
  }, [allPlayers, searchQuery, activeTab, selectedParticipants]);

  const handleToggleParticipant = (player: Player) => {
    const isSelected = selectedParticipants.some((p) => p.id === player.id);
    if (isSelected) {
      onParticipantsChange(selectedParticipants.filter((p) => p.id !== player.id));
    } else {
      if (selectedParticipants.length >= maxParticipants) {
        setError(`Максимум ${maxParticipants} участников`);
        return;
      }
      onParticipantsChange([...selectedParticipants, player]);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Если перетаскиваем в drop zone выбранных
    if (overId === "selected-drop-zone") {
      const player = allPlayers.find((p) => p.id.toString() === activeId);
      if (player && !selectedParticipants.some((p) => p.id === player.id)) {
        if (selectedParticipants.length < maxParticipants) {
          handleToggleParticipant(player);
        }
      }
      return;
    }

    // Определяем источник и цель по data-атрибутам
    const activeElement = document.querySelector(`[data-id="${activeId}"]`);
    const overElement = document.querySelector(`[data-id="${overId}"]`);
    
    const activeSource = activeElement?.getAttribute("data-source");
    const overSource = overElement?.getAttribute("data-source");

    // Если перетаскиваем из списка всех в выбранные (на другую карточку)
    if (activeSource === "all" && overSource === "selected") {
      const player = allPlayers.find((p) => p.id.toString() === activeId);
      if (player && !selectedParticipants.some((p) => p.id === player.id)) {
        if (selectedParticipants.length < maxParticipants) {
          handleToggleParticipant(player);
        }
      }
      return;
    }

    // Если перетаскиваем внутри выбранных - меняем порядок
    if (activeSource === "selected" && overSource === "selected") {
      const oldIndex = selectedParticipants.findIndex((p) => p.id.toString() === activeId);
      const newIndex = selectedParticipants.findIndex((p) => p.id.toString() === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onParticipantsChange(arrayMove(selectedParticipants, oldIndex, newIndex));
      }
    }
  };

  const handleClear = () => {
    onParticipantsChange([]);
  };

  const selectedIds = new Set(selectedParticipants.map((p) => p.id));
  const draggedPlayer = activeId
    ? allPlayers.find((p) => p.id.toString() === activeId) ||
      selectedParticipants.find((p) => p.id.toString() === activeId)
    : null;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Заголовок с табами */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2, pb: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Частые" value="frequent" />
          <Tab label="Последние" value="recent" />
          <Tab label="Избранные" value="favorites" />
          <Tab label="Все участники" value="all" />
        </Tabs>
      </Box>

      {/* Основной контент - двухколоночный layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ flex: 1, display: "flex", gap: 2, overflow: "hidden" }}>
          {/* Левая колонка - Все участники */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Typography variant="h6" gutterBottom sx={{ color: "primary.main", fontWeight: 600 }}>
              Все участники
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Поиск по имени, @username, tg_id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                overflow: "auto",
                p: 2,
                bgcolor: "background.default",
              }}
            >
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : filteredPlayers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" p={3}>
                  {searchQuery.trim() ? "Ничего не найдено" : "Нет доступных участников"}
                </Typography>
              ) : (
                <SortableContext
                  items={filteredPlayers.map((p) => p.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack spacing={1}>
                    {filteredPlayers.map((player) => (
                      <div
                        key={player.id}
                        data-source="all"
                        data-id={player.id.toString()}
                      >
                        <PlayerCard
                          player={player}
                          isSelected={selectedIds.has(player.id)}
                          onToggle={() => handleToggleParticipant(player)}
                          isDragging={activeId === player.id.toString()}
                          draggable={true}
                        />
                      </div>
                    ))}
                  </Stack>
                </SortableContext>
              )}
            </Paper>
          </Box>

        {/* Правая колонка - Выбранные участники */}
        <Box
          sx={{
            width: { xs: "100%", md: 350 },
            display: "flex",
            flexDirection: "column",
            borderLeft: { xs: "none", md: 1 },
            borderTop: { xs: 1, md: "none" },
            borderColor: "divider",
            pl: { xs: 0, md: 2 },
            pt: { xs: 2, md: 0 },
            mt: { xs: 2, md: 0 },
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: "primary.main", fontWeight: 600 }}>
            Выбранные участники
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Выбрано: {selectedParticipants.length} / {maxParticipants}
            </Typography>
          </Box>

          <DroppableArea id="selected-drop-zone">
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                overflow: "auto",
                p: 2,
                mb: 2,
                bgcolor: "background.default",
                minHeight: { xs: 200, md: 0 },
              }}
            >
              {selectedParticipants.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" p={3}>
                  Выберите участников из списка слева или перетащите их сюда
                </Typography>
              ) : (
                <SortableContext
                  items={selectedParticipants.map((p) => p.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack spacing={1}>
                    {selectedParticipants.map((player) => (
                      <div
                        key={player.id}
                        data-source="selected"
                        data-id={player.id.toString()}
                      >
                        <PlayerCard
                          player={player}
                          isSelected={true}
                          onToggle={() => handleToggleParticipant(player)}
                          draggable={true}
                        />
                      </div>
                    ))}
                  </Stack>
                </SortableContext>
              )}
            </Paper>
          </DroppableArea>

          {/* Чипсы выбранных (компактный вид) */}
          {selectedParticipants.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Быстрый просмотр:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                {selectedParticipants.map((player) => (
                  <SelectedChip
                    key={player.id}
                    player={player}
                    onRemove={() => handleToggleParticipant(player)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Кнопки действий */}
          <Stack spacing={1}>
            <Button
              variant="outlined"
              onClick={handleClear}
              disabled={selectedParticipants.length === 0}
              fullWidth
            >
              Очистить
            </Button>
            <Button
              variant="contained"
              onClick={onCreateTournament}
              disabled={creatingTournament || selectedParticipants.length === 0}
              fullWidth
              size="large"
            >
              {creatingTournament ? "Создаём..." : "Создать турнир"}
            </Button>
            <Button variant="text" onClick={onClose} fullWidth>
              Отмена
            </Button>
          </Stack>
        </Box>
        </Box>
        <DragOverlay>
          {draggedPlayer ? (
            <Box sx={{ width: 300 }}>
              <PlayerCard
                player={draggedPlayer}
                isSelected={false}
                onToggle={() => {}}
                isDragging={true}
              />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Box>
  );
}

