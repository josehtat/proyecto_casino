import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',  // Indicar la carpeta con tu código fuente
  base: '/',
  build: {
    rollupOptions: {
      input: {
          main: '/home/super/AWS2/sintesi/proyecto_casino/src/index.html', // Ruta completa al index.html
          game: '/home/super/AWS2/sintesi/proyecto_casino/src/game.html'   // Ruta completa al game.html
      }
  },
    outDir: '../public',  // Directorio donde se generarán los archivos compilados
  },
  server: {
    hmr: {
      port: process.env.APP_PORT || 3000,
      clientPort: 3000,
      path: "/vite-hmr"
    }
  }
});