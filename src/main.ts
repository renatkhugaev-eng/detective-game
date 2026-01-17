// ============================================
// ТОЧКА ВХОДА В ИГРУ
// ============================================

import './style.css';
import { Game } from './core/Game';

// Ждём загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
  // Создание контейнера для игры
  const container = document.getElementById('app');
  
  if (!container) {
    console.error('Container #app not found!');
    return;
  }
  
  // Очистка контейнера
  container.innerHTML = '';
  
  try {
    // Инициализация игры
    const game = Game.getInstance(container);
    
    // Запуск игры
    await game.start();
    
    // Добавление в глобальный объект для отладки
    (window as any).game = game;
    
    console.log('🎮 Detective Game is running!');
  } catch (error) {
    console.error('Failed to start game:', error);
    container.innerHTML = `
      <div style="color: white; padding: 20px; text-align: center;">
        <h1>❌ Ошибка запуска игры</h1>
        <p>${error}</p>
      </div>
    `;
  }
});

// Обработка ошибок
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
