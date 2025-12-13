import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
} from "@mui/material";

const API_URL = import.meta.env.VITE_API_URL as string;

interface Chat {
  id: number;
  tg_chat_id: number;
  title: string | null;
  type: string | null;
  role: "admin" | "member";
}

interface ChatSelectorProps {
  userTgId: number;
  onChatSelected: (chatId: number) => void;
}

export default function ChatSelector({ userTgId, onChatSelected }: ChatSelectorProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/chats?admin_only=true`, {
          headers: {
            "X-User-Tg-Id": userTgId.toString(),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Chat[] = await response.json();
        setChats(data);

        // Если только одна группа, автоматически выбираем её
        if (data.length === 1) {
          onChatSelected(data[0].id);
        }
      } catch (e: any) {
        console.error("Error loading chats:", e);
        setError(e.message || "Не удалось загрузить список групп");
      } finally {
        setLoading(false);
      }
    };

    if (userTgId) {
      loadChats();
    }
  }, [userTgId, onChatSelected]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  if (chats.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Нет доступных групп
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Добавьте бота в Telegram-группу и убедитесь, что у вас есть права администратора.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ color: "#d97706", fontWeight: 600 }}>
        Выберите группу
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Выберите группу для работы с турнирами
      </Typography>
      <List>
        {chats.map((chat) => (
          <ListItem key={chat.id} disablePadding>
            <ListItemButton onClick={() => onChatSelected(chat.id)}>
              <ListItemText
                primary={chat.title || `Группа #${chat.tg_chat_id}`}
                secondary={chat.role === "admin" ? "Администратор" : "Участник"}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

