// ============================================
// ГЛАВНЫЙ КЛАСС ИГРЫ
// ============================================

import * as THREE from 'three';
import { Renderer } from './Renderer';
import { Loop } from './Loop';
import { SceneManager } from './SceneManager';
import { InputSystem } from '../systems/InputSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { GameStore } from '../systems/GameStore';
import { AssetLoader } from '../utils/AssetLoader';

export class Game {
  private static instance: Game;
  
  public renderer: Renderer;
  public loop: Loop;
  public sceneManager: SceneManager;
  public input: InputSystem;
  public audio: AudioSystem;
  public assets: AssetLoader;
  public store: typeof GameStore;
  
  private container: HTMLElement;
  private clock: THREE.Clock;
  
  private constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    
    // Инициализация систем
    this.renderer = new Renderer(container);
    this.loop = new Loop();
    this.sceneManager = new SceneManager();
    this.input = new InputSystem();
    this.audio = new AudioSystem();
    this.assets = new AssetLoader();
    this.store = GameStore;
    
    // Добавляем обновление в игровой цикл
    this.loop.addUpdate(this.update.bind(this));
    
    // Обработка изменения размера окна
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('orientationchange', () => {
      // Задержка для корректного определения размеров после поворота
      setTimeout(() => this.onResize(), 100);
    });
    
    console.log('🎮 Detective Game initialized');
  }
  
  // Singleton паттерн
  public static getInstance(container?: HTMLElement): Game {
    if (!Game.instance) {
      if (!container) {
        throw new Error('Container required for first initialization');
      }
      Game.instance = new Game(container);
    }
    return Game.instance;
  }
  
  // Запуск игры
  public async start(): Promise<void> {
    console.log('🚀 Starting game...');
    
    // Загрузка ассетов
    this.store.getState().setGameState('loading');
    await this.loadAssets();
    
    // Инициализация начальной сцены
    await this.sceneManager.loadScene('menu');
    
    // Настройка рендерера для текущей сцены
    this.setupRendererForCurrentScene();
    
    // Запуск игрового цикла
    this.loop.start();
    
    this.store.getState().setGameState('menu');
    console.log('✅ Game started');
  }
  
  // Настройка рендерера для текущей сцены
  public setupRendererForCurrentScene(): void {
    const scene = this.sceneManager.getThreeScene();
    const camera = this.sceneManager.getCamera();
    
    if (scene && camera) {
      this.renderer.setupPostProcessing(scene, camera);
    }
  }
  
  // Главный update
  private update(delta: number, elapsed: number): void {
    // Обновление сцены
    this.sceneManager.update(delta, elapsed);
    
    // Рендеринг
    const scene = this.sceneManager.getThreeScene();
    const camera = this.sceneManager.getCamera();
    
    if (scene && camera) {
      // Используем прямой рендеринг вместо пост-обработки для надёжности
      this.renderer.renderDirect(scene, camera);
    }
  }
  
  // Загрузка ассетов — теперь только скрывает начальный экран загрузки
  // Основная загрузка происходит в GameScene при нажатии "Играть"
  private async loadAssets(): Promise<void> {
    console.log('📦 Game initialized, assets will load on demand');
    
    // Скрываем начальный экран загрузки (меню загружается быстро)
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }
  
  // Публичный метод для загрузки игровых ассетов с прогрессом
  public async loadGameAssets(): Promise<void> {
    console.log('📦 Loading game assets...');
    
    const progressBar = document.getElementById('loading-progress');
    const percentText = document.getElementById('loading-percent');
    const statusText = document.getElementById('loading-status');
    const bytesText = document.getElementById('loading-bytes');
    
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };
    
    const updateProgress = (percent: number, status: string, loaded?: number, total?: number) => {
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (percentText) percentText.textContent = `${Math.round(percent)}%`;
      if (statusText) statusText.textContent = status;
      if (bytesText && loaded !== undefined && total !== undefined) {
        bytesText.textContent = `${formatBytes(loaded)} / ${formatBytes(total)}`;
      } else if (bytesText) {
        bytesText.textContent = '';
      }
    };
    
    // Проверяем, не загружены ли уже модели
    if (this.assets.getModel('office') && this.assets.getModel('detective')) {
      console.log('⚡ Assets already loaded!');
      updateProgress(100, '✅ Готово!');
      return;
    }
    
    // Определяем мобильное устройство
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    console.log(`📱 Device: ${isMobile ? 'Mobile' : 'Desktop'}`);
    
    try {
      // Выбираем модель в зависимости от устройства
      const officeModelUrl = isMobile 
        ? '/models/detective/glb_vintageoffice_mobile.glb'  // 8MB для мобильных
        : '/models/detective/glb_vintageoffice.glb';        // 42MB для десктопа
      
      const expectedSize = isMobile ? 8000000 : 44000000;
      
      // Загрузка офиса (основная модель ~85% времени)
      updateProgress(0, '🏢 Загрузка офиса...', 0, expectedSize);
      await this.assets.loadModelWithProgress('office', officeModelUrl, (percent, loaded, total) => {
        updateProgress(percent * 0.85, '🏢 Загрузка офиса...', loaded, total);
      });
      
      // Загрузка детектива
      updateProgress(85, '👤 Загрузка персонажа...', 0, 2200000);
      await this.assets.loadModelWithProgress('detective', '/models/detective/detective.glb', (percent, loaded, total) => {
        updateProgress(85 + percent * 0.12, '👤 Загрузка персонажа...', loaded, total);
      });
      
      // Финализация
      updateProgress(97, '⚙️ Подготовка сцены...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      updateProgress(100, '✅ Готово!');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('✅ All game assets loaded!');
    } catch (error) {
      console.error('❌ Failed to load assets:', error);
      throw new Error('Не удалось загрузить модели. Проверьте интернет-соединение.');
    }
  }
  
  // Обработка изменения размера
  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.sceneManager.onResize(width, height);
    
    console.log(`📐 Resized to: ${width}x${height}`);
  }
  
  // Пауза игры
  public pause(): void {
    this.loop.stop();
    this.store.getState().setGameState('paused');
  }
  
  // Продолжение игры
  public resume(): void {
    this.loop.start();
    this.store.getState().setGameState('playing');
  }
  
  // Получение delta time
  public getDelta(): number {
    return this.clock.getDelta();
  }
  
  // Получение общего времени
  public getElapsedTime(): number {
    return this.clock.getElapsedTime();
  }
  
  // Уничтожение игры
  public dispose(): void {
    this.loop.stop();
    this.renderer.dispose();
    this.input.dispose();
    this.audio.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
    console.log('🗑️ Game disposed');
  }
}
