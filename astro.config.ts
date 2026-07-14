import solidJs from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs()],
  vite: {
    plugins: [tailwindcss() as unknown as import("vite").Plugin],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    optimizeDeps: {
      include: ["pdfmake/build/pdfmake", "pdfmake/build/vfs_fonts"],
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
  },
});
