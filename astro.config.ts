import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs()],
  vite: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [tailwindcss() as any],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    optimizeDeps: {
      include: ["pdfmake/build/pdfmake", "pdfmake/build/vfs_fonts"],
    },
  },
});
