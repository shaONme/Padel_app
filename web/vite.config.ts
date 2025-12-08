import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      "great-lions-chew.loca.lt", // ✅ твой localtunnel адрес
    ],
  },
});
