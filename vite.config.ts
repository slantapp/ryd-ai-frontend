import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  // optimizeDeps: {
  //   exclude: ["@met4citizen/talkinghead"],
  // },
  optimizeDeps: { exclude: ['@met4citizen/talkinghead'] },
  build: {
    rollupOptions: {
      external: ['@met4citizen/talkinghead', 'three'],
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

