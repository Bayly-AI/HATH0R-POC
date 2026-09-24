import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Client calls relative /api/* paths; Vite proxies to the loopback adapter.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
