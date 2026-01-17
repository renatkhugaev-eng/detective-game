// ============================================
// СЦЕНА ГЛАВНОГО МЕНЮ
// ============================================

import * as THREE from 'three';
import { BaseScene } from './BaseScene';
import { IsometricCamera } from '../core/IsometricCamera';

export class MenuScene extends BaseScene {
  private isoCamera: IsometricCamera | null = null;
  private menuObjects: THREE.Group = new THREE.Group();
  private particles: THREE.Points | null = null;
  
  constructor() {
    super();
  }
  
  public async init(): Promise<void> {
    // Изометрическая камера
    this.isoCamera = new IsometricCamera(window.innerWidth, window.innerHeight);
    this.camera = this.isoCamera.camera;
    
    // Атмосферный фон для детектива
    this.scene.background = new THREE.Color(0x1a2a3a);
    
    // Освещение
    this.setupLighting();
    
    // Декоративные элементы меню
    this.createMenuDecorations();
    
    // Частицы (пыль в воздухе)
    this.createParticles();
    
    this.scene.add(this.menuObjects);
    
    this.isInitialized = true;
    console.log('🎨 Menu scene initialized');
  }
  
  private setupLighting(): void {
    // Ambient light (мягкий общий свет)
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);
    
    // Направленный свет (как от окна)
    const directionalLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Точечный свет (настольная лампа)
    const pointLight = new THREE.PointLight(0xffaa44, 1.5, 20);
    pointLight.position.set(1.5, 2, 0.5);
    pointLight.castShadow = true;
    this.scene.add(pointLight);
    
    // Хемисферный свет
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    this.scene.add(hemiLight);
  }
  
  private createMenuDecorations(): void {
    // Пол (деревянный)
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.menuObjects.add(floor);
    
    // Стол детектива
    const deskGeometry = new THREE.BoxGeometry(4, 0.2, 2);
    const deskMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.6,
    });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.set(0, 0.8, 0);
    desk.castShadow = true;
    desk.receiveShadow = true;
    this.menuObjects.add(desk);
    
    // Ножки стола
    const legGeometry = new THREE.BoxGeometry(0.15, 0.8, 0.15);
    const legPositions = [
      [-1.8, 0.4, -0.8],
      [1.8, 0.4, -0.8],
      [-1.8, 0.4, 0.8],
      [1.8, 0.4, 0.8],
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, deskMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.menuObjects.add(leg);
    });
    
    // Лупа на столе
    this.createMagnifyingGlass();
    
    // Папка с делом
    this.createCaseFolder();
    
    // Настольная лампа
    this.createDeskLamp();
  }
  
  private createMagnifyingGlass(): void {
    const group = new THREE.Group();
    
    // Ручка
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.06, 0.5, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      roughness: 0.4,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.z = Math.PI / 4;
    handle.position.set(0.2, 0, 0.2);
    group.add(handle);
    
    // Рамка линзы
    const frameGeometry = new THREE.TorusGeometry(0.2, 0.03, 16, 32);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.rotation.x = Math.PI / 2;
    group.add(frame);
    
    // Линза (стекло)
    const lensGeometry = new THREE.CircleGeometry(0.18, 32);
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.3,
      metalness: 0.1,
      roughness: 0.1,
    });
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.rotation.x = -Math.PI / 2;
    lens.position.y = 0.01;
    group.add(lens);
    
    group.position.set(-1, 0.95, 0.3);
    group.rotation.y = Math.PI / 6;
    group.castShadow = true;
    this.menuObjects.add(group);
  }
  
  private createCaseFolder(): void {
    const folderGeometry = new THREE.BoxGeometry(0.8, 0.05, 1);
    const folderMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
    });
    const folder = new THREE.Mesh(folderGeometry, folderMaterial);
    folder.position.set(0.5, 0.93, -0.2);
    folder.rotation.y = -0.1;
    folder.castShadow = true;
    this.menuObjects.add(folder);
    
    // Бумаги торчащие из папки
    const paperGeometry = new THREE.BoxGeometry(0.7, 0.01, 0.9);
    const paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc,
      roughness: 0.9,
    });
    const paper = new THREE.Mesh(paperGeometry, paperMaterial);
    paper.position.set(0.55, 0.96, -0.15);
    paper.rotation.y = -0.05;
    this.menuObjects.add(paper);
  }
  
  private createDeskLamp(): void {
    const group = new THREE.Group();
    
    // База лампы
    const baseGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.05, 16);
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.9,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(baseGeometry, metalMaterial);
    group.add(base);
    
    // Стойка
    const standGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);
    const stand = new THREE.Mesh(standGeometry, metalMaterial);
    stand.position.y = 0.3;
    group.add(stand);
    
    // Абажур
    const shadeGeometry = new THREE.ConeGeometry(0.2, 0.15, 16, 1, true);
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a472a,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = 0.65;
    shade.rotation.x = Math.PI;
    group.add(shade);
    
    group.position.set(1.5, 0.9, 0.5);
    group.castShadow = true;
    this.menuObjects.add(group);
  }
  
  private createParticles(): void {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = Math.random() * 10;
      positions[i + 2] = (Math.random() - 0.5) * 20;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.4,
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }
  
  public async onEnter(): Promise<void> {
    console.log('🏠 Entering menu scene');
    
    // Создание HTML UI для меню
    this.createMenuUI();
  }
  
  private createMenuUI(): void {
    // Удаляем старое меню если есть
    const oldMenu = document.getElementById('main-menu');
    if (oldMenu) oldMenu.remove();
    
    const menuContainer = document.createElement('div');
    menuContainer.id = 'main-menu';
    menuContainer.innerHTML = `
      <div class="menu-content">
        <h1 class="game-title">🔍 ДЕТЕКТИВ</h1>
        <p class="game-subtitle">Тайны ждут разгадки</p>
        <div class="menu-buttons">
          <button class="menu-btn" id="btn-new-game">Новая игра</button>
          <button class="menu-btn" id="btn-continue" disabled>Продолжить</button>
          <button class="menu-btn" id="btn-settings">Настройки</button>
          <button class="menu-btn" id="btn-exit">Выход</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(menuContainer);
    
    // Обработчики кнопок
    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      this.startNewGame();
    });
    
    document.getElementById('btn-exit')?.addEventListener('click', () => {
      window.close();
    });
  }
  
  private async startNewGame(): Promise<void> {
    // Удаляем меню
    document.getElementById('main-menu')?.remove();
    
    // Показываем экран загрузки
    this.showLoadingScreen();
    
    try {
      // Загружаем игровые ассеты с прогрессом
      const { Game } = await import('../core/Game');
      const game = Game.getInstance();
      
      // Загрузка моделей с отображением прогресса
      await game.loadGameAssets();
      
      // Переход к игровой сцене
      await game.sceneManager.loadScene('game');
      game.setupRendererForCurrentScene();
      game.store.getState().setGameState('playing');
      
      // Скрываем экран загрузки
      this.hideLoadingScreen();
    } catch (error) {
      console.error('❌ Error starting game:', error);
      this.showError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    }
  }
  
  private showError(message: string): void {
    const statusText = document.getElementById('loading-status');
    const percentText = document.getElementById('loading-percent');
    const bytesText = document.getElementById('loading-bytes');
    const spinner = document.querySelector('.loading-spinner') as HTMLElement;
    const progressContainer = document.querySelector('.loading-progress-container') as HTMLElement;
    
    if (statusText) {
      statusText.textContent = `❌ Ошибка: ${message}`;
      statusText.style.color = '#ff6b6b';
    }
    if (percentText) percentText.style.display = 'none';
    if (bytesText) bytesText.textContent = 'Попробуйте обновить страницу';
    if (spinner) spinner.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'none';
  }
  
  private showLoadingScreen(): void {
    console.log('🔄 Showing loading screen...');
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'flex';
      loadingScreen.style.opacity = '1';
      loadingScreen.classList.remove('hidden');
      
      // Сбрасываем прогресс
      const progressBar = document.getElementById('loading-progress');
      const percentText = document.getElementById('loading-percent');
      const statusText = document.getElementById('loading-status');
      const bytesText = document.getElementById('loading-bytes');
      
      if (progressBar) progressBar.style.width = '0%';
      if (percentText) percentText.textContent = '0%';
      if (statusText) statusText.textContent = '🎮 Подготовка...';
      if (bytesText) bytesText.textContent = '';
      
      console.log('✅ Loading screen displayed');
    } else {
      console.error('❌ Loading screen element not found!');
    }
  }
  
  private hideLoadingScreen(): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 800);
    }
  }
  
  public async onExit(): Promise<void> {
    console.log('📤 Exiting menu scene');
    document.getElementById('main-menu')?.remove();
  }
  
  public update(delta: number, elapsed: number): void {
    // Анимация частиц (медленное падение)
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 0.1;
        if (positions[i] < 0) {
          positions[i] = 10;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  public onResize(width: number, height: number): void {
    if (this.isoCamera) {
      this.isoCamera.onResize(width, height);
    }
  }
}
