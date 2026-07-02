import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import "./scripts/env.mjs";

const apiPort = process.env.HORIZON_API_PORT ?? "8791";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5177,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
    },
  },
});
