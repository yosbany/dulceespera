import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas: funcionan en GitHub Pages (/dulceespera/)
  // y en el dominio custom (https://dulceespera.nrdonline.site/).
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
