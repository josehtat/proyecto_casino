import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',  // Indicar la carpeta con tu código fuente
  base: '/',
  build: {
    outDir: '../dist',  // Directorio donde se generarán los archivos compilados
  },
  server: {
    hmr: {
      port: process.env.APP_PORT || 3000,
      clientPort: 3000,
      path: "/vite-hmr"
    }
  }
});