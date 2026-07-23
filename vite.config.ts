import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("monaco-editor") || id.includes("@monaco-editor")) {
            return "monaco";
          }
          if (id.includes("node_modules/three")) {
            return "three";
          }
          if (
            id.includes("narrator-avatar") ||
            id.includes("@sage-rsc/talking-head") ||
            id.includes("@met4citizen/talkinghead")
          ) {
            return "avatar";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    preserveSymlinks: false,
  },
  server: {
    port: 3000, // 👈 Set desired port here
  },
});

