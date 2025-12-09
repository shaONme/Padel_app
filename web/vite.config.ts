import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    server: {
      host: true,
      allowedHosts: [
        "great-lions-chew.loca.lt", // ✅ твой localtunnel адрес
      ],
    },
    // Определяем переменные окружения по умолчанию
    define: {
      // В режиме разработки используем локальный API, если не задан VITE_API_URL
      ...(mode === "development" && !process.env.VITE_API_URL && {
        "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:8000"),
      }),
    },
  };
});
