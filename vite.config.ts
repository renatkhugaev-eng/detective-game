import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Базовый путь для Electron
  base: './',
  
  // Настройки сервера разработки
  server: {
    port: 5173,
    strictPort: true,
  },
  
  // Настройки сборки
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  
  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['three', 'postprocessing', 'howler', 'zustand'],
  },
  
  // Резолвинг путей
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@systems': resolve(__dirname, 'src/systems'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
});
