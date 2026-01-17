// ============================================
// ELECTRON MAIN PROCESS
// ============================================

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Определяем режим разработки
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  // Создание окна браузера
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: '🔍 Детектив',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#0d1b2a',
    show: false, // Показываем после загрузки
  });

  // Загрузка приложения
  if (isDev) {
    // В режиме разработки загружаем с Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Открываем DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // В продакшене загружаем собранные файлы
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Показываем окно когда готово
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Обработка закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Убираем стандартное меню в продакшене
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }
}

// Создание окна когда Electron готов
app.whenReady().then(() => {
  createWindow();

  // На macOS пересоздаём окно при клике на иконку в доке
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выход при закрытии всех окон (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
