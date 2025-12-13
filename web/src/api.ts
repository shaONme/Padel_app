/**
 * Утилиты для работы с API
 */

const API_URL = import.meta.env.VITE_API_URL as string;

export function getHeaders(userTgId: number | null, chatId: number | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (userTgId !== null) {
    headers["X-User-Tg-Id"] = userTgId.toString();
  }
  
  if (chatId !== null) {
    headers["X-Chat-Id"] = chatId.toString();
  }
  
  return headers;
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  userTgId: number | null,
  chatId: number | null = null
): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      ...getHeaders(userTgId, chatId),
      ...options.headers,
    },
  });
}

