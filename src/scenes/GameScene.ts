// ============================================
// ИГРОВАЯ СЦЕНА
// ============================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseScene } from './BaseScene';
import { IsometricCamera } from '../core/IsometricCamera';
import { Player } from '../entities/Player';
import { InteractiveObject } from '../entities/InteractiveObject';
import { GameStore } from '../systems/GameStore';
import { MobileControls } from '../systems/MobileControls';
import { Game } from '../core/Game';

export class GameScene extends BaseScene {
  private isoCamera: IsometricCamera | null = null;
  private player: Player | null = null;
  private interactiveObjects: InteractiveObject[] = [];
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Mesh | null = null;
  private officeModel: THREE.Group | null = null;
  private collisionObjects: THREE.Box3[] = []; // Боксы коллизий для мебели
  
  // Двери
  private doors: { mesh: THREE.Object3D; isOpen: boolean; pivot: THREE.Object3D; targetAngle: number }[] = [];
  
  // UI элементы
  private hudElement: HTMLElement | null = null;
  private dialogueElement: HTMLElement | null = null;
  
  // Для WASD движения
  private keys: { [key: string]: boolean } = {};
  
  // Для управления камерой мышью
  private isMiddleMouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  
  // Мобильное управление
  private mobileControls: MobileControls | null = null;
  
  constructor() {
    super();
  }
  
  public async init(): Promise<void> {
    try {
      console.log('🎮 Initializing game scene...');
      
      // Изометрическая камера
      console.log('📷 Creating camera...');
      this.isoCamera = new IsometricCamera(window.innerWidth, window.innerHeight);
      this.camera = this.isoCamera.camera;
      
      // Фон
      this.scene.background = new THREE.Color(0x1a1a2e);
      
      // Освещение
      console.log('💡 Setting up lighting...');
      this.setupLighting();
      
      // Загрузка модели офиса
      console.log('🏢 Loading office model...');
      await this.loadOfficeModel();
      
      // Создание невидимого пола для кликов
      console.log('🟫 Creating ground plane...');
      this.createGroundPlane();
      
      // Создание игрока
      console.log('👤 Creating player...');
      this.player = new Player();
      // Ждём загрузки модели игрока
      await this.player.waitForLoad();
      console.log('👤 Player model loaded');
      // Масштаб персонажа (большой, реалистичный)
      this.player.setScale(8);
      // Позиция в центре модели - пол примерно на Y=0
      this.player.setFloorY(0);
      // Ставим ближе к дверям (они на distance ~160)
      this.player.setPosition(new THREE.Vector3(100, 0, 50));
      // Передаём коллизии
      this.player.setCollisionBoxes(this.collisionObjects);
      this.scene.add(this.player.mesh);
      
      // Создание интерактивных объектов
      console.log('🎯 Creating interactive objects...');
      this.createInteractiveObjects();
      
      // Настройка управления
      console.log('🎮 Setting up controls...');
      this.setupControls();
      
      this.isInitialized = true;
      console.log('✅ Game scene initialized successfully!');
    } catch (error) {
      console.error('❌ Error initializing game scene:', error);
      throw error;
    }
  }
  
  private setupLighting(): void {
    // Ambient light - слабое общее освещение (чтобы мерцание было заметно)
    const ambientLight = new THREE.AmbientLight(0x222233, 0.3);
    this.scene.add(ambientLight);
    
    // Направленный свет (имитация света из окна)
    const directionalLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Дополнительный свет сверху
    const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
    topLight.position.set(0, 10, 0);
    this.scene.add(topLight);
    
    // Мерцающие свечи будут созданы после загрузки модели
    this.flickeringLights = [];
  }
  
  // Массив мерцающих источников света
  private flickeringLights: { light: THREE.PointLight; baseIntensity: number; speed: number; offset: number }[] = [];
  
  // Создание мерцающих источников света (вызывается после загрузки модели)
  private setupFlickeringLights(modelCenter: THREE.Vector3, modelSize: THREE.Vector3): void {
    // Очищаем старые
    for (const f of this.flickeringLights) {
      this.scene.remove(f.light);
    }
    this.flickeringLights = [];
    
    // Свет низко над полом, очень яркий, большой радиус
    const lightY = 8;
    const lightRange = 1000; // Огромный радиус
    
    // Свет 1 - главная люстра в центре (супер яркий)
    const mainLight = new THREE.PointLight(0xffcc77, 200, lightRange);
    mainLight.position.set(modelCenter.x, lightY + 15, modelCenter.z);
    this.scene.add(mainLight);
    this.flickeringLights.push({ light: mainLight, baseIntensity: 200, speed: 3, offset: 0 });
    
    // Свет 2 - камин слева (красноватый)
    const fireLight = new THREE.PointLight(0xff6633, 150, lightRange);
    fireLight.position.set(modelCenter.x - 80, lightY + 5, modelCenter.z + 50);
    this.scene.add(fireLight);
    this.flickeringLights.push({ light: fireLight, baseIntensity: 150, speed: 8, offset: 1 });
    
    // Свет 3 - справа
    const candleLight1 = new THREE.PointLight(0xffdd88, 100, lightRange);
    candleLight1.position.set(modelCenter.x + 80, lightY + 8, modelCenter.z - 40);
    this.scene.add(candleLight1);
    this.flickeringLights.push({ light: candleLight1, baseIntensity: 100, speed: 6, offset: 2 });
    
    // Свет 4 - сзади
    const candleLight2 = new THREE.PointLight(0xffbb66, 100, lightRange);
    candleLight2.position.set(modelCenter.x - 50, lightY + 6, modelCenter.z - 60);
    this.scene.add(candleLight2);
    this.flickeringLights.push({ light: candleLight2, baseIntensity: 100, speed: 5, offset: 3 });
    
    // Свет 5 - дополнительный спереди
    const frontLight = new THREE.PointLight(0xffaa55, 120, lightRange);
    frontLight.position.set(modelCenter.x + 30, lightY + 10, modelCenter.z + 70);
    this.scene.add(frontLight);
    this.flickeringLights.push({ light: frontLight, baseIntensity: 120, speed: 4, offset: 4 });
    
    // Свет 6 - ещё один в углу
    const cornerLight = new THREE.PointLight(0xffcc99, 80, lightRange);
    cornerLight.position.set(modelCenter.x - 100, lightY + 7, modelCenter.z - 30);
    this.scene.add(cornerLight);
    this.flickeringLights.push({ light: cornerLight, baseIntensity: 80, speed: 7, offset: 5 });
    
    console.log('🕯️ 6 flickering lights created, intensity up to 200, range:', lightRange);
  }
  
  // Обновление мерцания света
  private updateFlickeringLights(elapsed: number): void {
    for (const flicker of this.flickeringLights) {
      // Несколько волн шума для реалистичного мерцания
      const noise1 = Math.sin(elapsed * flicker.speed + flicker.offset) * 0.2;
      const noise2 = Math.sin(elapsed * flicker.speed * 2.3 + flicker.offset * 1.7) * 0.15;
      const noise3 = Math.sin(elapsed * flicker.speed * 0.7 + flicker.offset * 0.5) * 0.1;
      const randomFlicker = (Math.random() - 0.5) * 0.1; // Случайные вспышки
      
      flicker.light.intensity = flicker.baseIntensity * (1 + noise1 + noise2 + noise3 + randomFlicker);
    }
  }
  
  private async loadOfficeModel(): Promise<void> {
    // Пробуем получить предзагруженную модель
    const cachedModel = Game.getInstance().assets.getModel('office');
    
    if (cachedModel) {
      console.log('⚡ Using cached office model!');
      this.officeModel = cachedModel.scene.clone() as THREE.Group;
      this.processOfficeModel();
      return;
    }
    
    // Fallback: загружаем напрямую
    return new Promise((resolve, reject) => {
      console.log('📦 Loading vintage office model...');
      const loader = new GLTFLoader();
      loader.load(
        '/models/detective/glb_vintageoffice.glb',
        (gltf) => {
          this.officeModel = gltf.scene;
          this.processOfficeModel();
          resolve();
        },
        () => {},
        (error) => {
          console.error('❌ Error loading model:', error);
          this.createFallbackRoom();
          resolve();
        }
      );
    });
  }
  
  private processOfficeModel(): void {
    if (!this.officeModel) return;
    
    // Увеличиваем модель до реального размера 1:1
    this.officeModel.scale.set(10, 10, 10);
    this.officeModel.position.set(0, 0, 0);
    
    // Clipping plane — обрезает всё выше Y=25
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 25);
    
    // Настраиваем тени и применяем clipping ко всем материалам
    this.officeModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Применяем clipping plane к материалу
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.clippingPlanes = [clipPlane];
              mat.clipShadows = true;
            });
          } else {
            child.material.clippingPlanes = [clipPlane];
            child.material.clipShadows = true;
          }
        }
      }
    });
    
    this.scene.add(this.officeModel);
    
    // Обновляем матрицы после добавления в сцену
    this.officeModel.updateMatrixWorld(true);
    
    // Создаём коллизии только для мебели
    this.officeModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        const name = child.name.toLowerCase();
        
        // Пропускаем стены, пол, потолок и мелкие детали
        if (name.includes('wall') || name.includes('floor') || name.includes('ceiling') ||
            name.includes('baseboard') || name.includes('window') || name.includes('blind') ||
            name.includes('poster') || name.includes('photo') || name.includes('paper') ||
            name.includes('document') || name.includes('pic') || name.includes('map') ||
            name.includes('cork') || name.includes('switch') || name.includes('clock')) {
          return;
        }
        
        // Создаём bounding box
        const box = new THREE.Box3().setFromObject(child);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        if (size.x > 5 && size.x < 150 && size.z > 5 && size.z < 150 && 
            size.y > 2 && size.y < 50 && center.y > 0 && center.y < 25) {
          this.collisionObjects.push(box);
        }
      }
    });
    
    console.log(`📦 Total collision boxes: ${this.collisionObjects.length}`);
    
    // Центрируем камеру на модели
    const box = new THREE.Box3().setFromObject(this.officeModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('📐 Model size:', size);
    console.log('📍 Model center:', center);
    
    if (this.isoCamera) {
      this.isoCamera.setTarget(center);
    }
    
    // Ставим игрока на пол модели (чуть выше)
    if (this.player) {
      const floorY = box.min.y + 5;
      this.player.setFloorY(floorY);
      this.player.setPosition(new THREE.Vector3(center.x, floorY, center.z));
      console.log('👤 Player placed at floor Y:', floorY);
    }
    
    // Создаём мерцающие источники света
    this.setupFlickeringLights(center, size);
    
    // Находим двери
    this.setupDoors();
    
    console.log('✅ Detective office model loaded!');
  }
  
  private createGroundPlane(): void {
    // Невидимый пол для определения кликов (на уровне пола комнаты)
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshBasicMaterial({
      visible: false,
    });
    this.groundPlane = new THREE.Mesh(floorGeometry, floorMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0.5; // Уровень пола в комнате
    this.scene.add(this.groundPlane);
  }
  
  private createFallbackRoom(): void {
    // Простая комната если модель не загрузилась
    console.log('⚠️ Creating fallback room...');
    
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Стены
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
    });
    
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(20, 5, 0.3),
      wallMaterial
    );
    backWall.position.set(0, 2.5, -10);
    this.scene.add(backWall);
  }
  
  // Настройка дверей с анимацией открытия
  private setupDoors(): void {
    if (!this.officeModel) return;
    
    // Сначала выведем ВСЕ названия объектов чтобы найти дверь
    console.log('🔍 Searching for doors...');
    const allNames: string[] = [];
    this.officeModel.traverse((child) => {
      if (child.name) {
        allNames.push(child.name);
      }
    });
    console.log('📋 All object names:', allNames.filter(n => 
      n.toLowerCase().includes('door') || 
      n.toLowerCase().includes('дверь') ||
      n.toLowerCase().includes('gate') ||
      n.toLowerCase().includes('entry')
    ));
    
    this.officeModel.traverse((child) => {
      const name = child.name.toLowerCase();
      
      // Ищем объекты с "door" в названии (расширенный поиск)
      if (name.includes('door') || name.includes('дверь') || name.includes('gate')) {
        console.log('🚪 Found door:', child.name, child.type);
        
        // Получаем bounding box двери
        const box = new THREE.Box3().setFromObject(child);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        console.log('  Size:', size.x.toFixed(1), size.y.toFixed(1), size.z.toFixed(1));
        console.log('  Center:', center.x.toFixed(1), center.y.toFixed(1), center.z.toFixed(1));
        
        // Сохраняем оригинальную дверь для простого вращения
        // Вместо pivot — будем вращать саму дверь вокруг её края
        
        // Сохраняем начальный угол
        const originalRotation = child.rotation.y;
        
        this.doors.push({
          mesh: child,
          pivot: child, // Используем саму дверь как pivot
          isOpen: false,
          targetAngle: originalRotation,
          originalAngle: originalRotation,
          // Сохраняем позицию петель (левый край двери)
          hingeOffset: new THREE.Vector3(-size.x / 2, 0, 0)
        } as any);
      }
    });
    
    console.log(`🚪 Total doors found: ${this.doors.length}`);
  }
  
  // Открыть/закрыть ближайшую дверь
  private toggleNearestDoor(): void {
    if (!this.player) return;
    
    const playerPos = this.player.getPosition();
    let nearestDoor = null;
    let nearestDistance = Infinity;
    
    for (const door of this.doors) {
      const doorPos = new THREE.Vector3();
      door.mesh.getWorldPosition(doorPos);
      
      const distance = playerPos.distanceTo(doorPos);
      
      if (distance < 40 && distance < nearestDistance) { // 40 единиц — нужно подойти к двери
        nearestDistance = distance;
        nearestDoor = door;
      }
    }
    
    if (nearestDoor) {
      const door = nearestDoor as any;
      door.isOpen = !door.isOpen;
      const originalAngle = door.originalAngle || 0;
      door.targetAngle = door.isOpen ? originalAngle - Math.PI / 2 : originalAngle; // 90 градусов от начальной позиции
      console.log(`🚪 Door ${door.isOpen ? 'OPENING' : 'CLOSING'}!`);
    } else {
      console.log('🚪 No door nearby (need to be within 200 units)');
    }
  }
  
  // Анимация дверей (вызывается в update)
  private updateDoors(delta: number): void {
    for (const door of this.doors as any[]) {
      const currentAngle = door.mesh.rotation.y;
      const diff = door.targetAngle - currentAngle;
      
      if (Math.abs(diff) > 0.01) {
        door.mesh.rotation.y += diff * 3 * delta; // Плавное открытие
      }
    }
  }
  
  private createInteractiveObjects(): void {
    // Улика 1: Письмо на столе
    const letter = new InteractiveObject({
      id: 'clue_letter',
      type: 'clue',
      name: 'Загадочное письмо',
      description: 'Письмо с неразборчивым почерком. Кажется, это важная улика.',
      position: new THREE.Vector3(0, 1, 0),
      onInteract: () => {
        GameStore.getState().addFoundClue('clue_letter');
        this.showDialogue('Вы нашли загадочное письмо! Почерк едва разборчив, но можно прочитать: "Встретимся в полночь у старого дуба..."');
      }
    });
    this.interactiveObjects.push(letter);
    this.scene.add(letter.mesh);
    
    // Улика 2: Ключ
    const key = new InteractiveObject({
      id: 'clue_key',
      type: 'clue',
      name: 'Старый ключ',
      description: 'Ржавый ключ, спрятанный в ящике.',
      position: new THREE.Vector3(2, 0.5, 1),
      onInteract: () => {
        GameStore.getState().addFoundClue('clue_key');
        this.showDialogue('Вы нашли старый ржавый ключ. От чего он может быть?');
      }
    });
    this.interactiveObjects.push(key);
    this.scene.add(key.mesh);
    
    // Улика 3: Фотография
    const photo = new InteractiveObject({
      id: 'clue_photo',
      type: 'clue',
      name: 'Старая фотография',
      description: 'Выцветшая фотография с группой людей.',
      position: new THREE.Vector3(-2, 1.5, -1),
      onInteract: () => {
        GameStore.getState().addFoundClue('clue_photo');
        this.showDialogue('На фотографии изображены четыре человека. Один из них обведён красным кружком...');
      }
    });
    this.interactiveObjects.push(photo);
    this.scene.add(photo.mesh);
  }
  
  private setupControls(): void {
    window.addEventListener('click', this.onMouseClick);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('wheel', this.onMouseWheel, { passive: false });
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('blur', this.onBlur);
    
    // Тач для перемещения на мобильных
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchstart', this.onTouchStart2, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: false });
    
    // Инициализируем мобильное управление (джойстик)
    this.mobileControls = new MobileControls();
  }
  
  // Переменные для вращения камеры одним пальцем
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isRotatingCamera: boolean = false;
  private rotationTouchId: number | null = null;
  private isSwiping: boolean = false; // Флаг: это свайп, а не тап
  private swipeThreshold: number = 15; // Минимальное расстояние для свайпа (пиксели)
  
  private isTouchInJoystickArea(touch: Touch): boolean {
    // Джойстик в левом нижнем углу
    const joystickArea = {
      left: 0,
      right: 200,
      top: window.innerHeight - 200,
      bottom: window.innerHeight
    };
    
    return touch.clientX >= joystickArea.left && 
           touch.clientX <= joystickArea.right &&
           touch.clientY >= joystickArea.top && 
           touch.clientY <= joystickArea.bottom;
  }
  
  private isTouchInRunButtonArea(touch: Touch): boolean {
    // Кнопка бега в правом нижнем углу
    const buttonArea = {
      left: window.innerWidth - 150,
      right: window.innerWidth,
      top: window.innerHeight - 150,
      bottom: window.innerHeight
    };
    
    return touch.clientX >= buttonArea.left && 
           touch.clientX <= buttonArea.right &&
           touch.clientY >= buttonArea.top && 
           touch.clientY <= buttonArea.bottom;
  }
  
  private isTouchInRotationArea(touch: Touch): boolean {
    // Весь экран кроме джойстика и кнопки бега — зона вращения камеры
    const isNotJoystick = !this.isTouchInJoystickArea(touch);
    const isNotRunButton = !this.isTouchInRunButtonArea(touch);
    return isNotJoystick && isNotRunButton;
  }
  
  private onTouchStart2 = (event: TouchEvent): void => {
    // Проверяем, начался ли тач в зоне вращения
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      if (this.isTouchInRotationArea(touch) && this.rotationTouchId === null) {
        this.rotationTouchId = touch.identifier;
        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isRotatingCamera = true;
        this.isSwiping = false; // Пока не знаем, свайп это или тап
      }
    }
  };
  
  private onTouchMove = (event: TouchEvent): void => {
    if (!this.isoCamera) return;
    
    // Вращение камеры одним пальцем
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      
      if (touch.identifier === this.rotationTouchId && this.isRotatingCamera) {
        const deltaX = touch.clientX - this.lastTouchX;
        const deltaY = touch.clientY - this.lastTouchY;
        const totalDeltaX = Math.abs(touch.clientX - this.touchStartX);
        const totalDeltaY = Math.abs(touch.clientY - this.touchStartY);
        const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
        
        // Определяем, что это свайп, если палец сдвинулся достаточно
        if (totalDistance > this.swipeThreshold) {
          this.isSwiping = true;
        }
        
        // Вращаем камеру только если это свайп
        if (this.isSwiping) {
          const rotationSpeed = 0.008;
          const pitchSpeed = 0.005;
          
          // Горизонтальный свайп - вращение камеры
          if (Math.abs(deltaX) > 1) {
            this.isoCamera.rotate(-deltaX * rotationSpeed);
            this.lastTouchX = touch.clientX;
          }
          
          // Вертикальный свайп - наклон камеры
          if (Math.abs(deltaY) > 1) {
            this.isoCamera.adjustPitch(deltaY * pitchSpeed);
            this.lastTouchY = touch.clientY;
          }
          
          event.preventDefault();
        }
        
        break;
      }
    }
  };
  
  private onTouchEnd = (event: TouchEvent): void => {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      
      if (touch.identifier === this.rotationTouchId) {
        // Если это был тап (не свайп) — двигаем персонажа
        if (!this.isSwiping && this.isTouchInRotationArea(touch)) {
          this.handleTapToMove(touch.clientX, touch.clientY);
        }
        
        // Сбрасываем состояние
        this.isRotatingCamera = false;
        this.rotationTouchId = null;
        this.lastTouchX = 0;
        this.isSwiping = false;
      }
    }
  };
  
  private onTouchStart = (event: TouchEvent): void => {
    // Теперь onTouchStart только запоминает позицию, движение в onTouchEnd
    // (логика перенесена для различения тапа и свайпа)
  };
  
  private handleTapToMove = (touchX: number, touchY: number): void => {
    if (!this.isoCamera || !this.player || !this.groundPlane) return;
    if (GameStore.getState().gameState !== 'playing') return;
    
    const rect = document.body.getBoundingClientRect();
    const x = ((touchX - rect.left) / rect.width) * 2 - 1;
    const y = -((touchY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    
    // Клик на пол - перемещение
    const groundIntersects = this.raycaster.intersectObject(this.groundPlane);
    if (groundIntersects.length > 0) {
      const point = groundIntersects[0].point;
      this.player.moveTo(point);
      return;
    }
    
    // Пробуем клик на модель комнаты
    if (this.officeModel) {
      const officeIntersects = this.raycaster.intersectObject(this.officeModel, true);
      if (officeIntersects.length > 0) {
        const point = officeIntersects[0].point;
        point.y = 0.5;
        this.player.moveTo(point);
      }
    }
  };
  
  private onMouseDown = (event: MouseEvent): void => {
    // Средняя кнопка мыши (колёсико)
    if (event.button === 1) {
      event.preventDefault();
      this.isMiddleMouseDown = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  };
  
  private onMouseUp = (event: MouseEvent): void => {
    if (event.button === 1) {
      this.isMiddleMouseDown = false;
    }
  };
  
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isMiddleMouseDown || !this.isoCamera) return;
    
    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    
    // Горизонтальное движение мыши - плавное вращение камеры
    if (Math.abs(deltaX) > 2) {
      this.isoCamera.rotate(-deltaX * 0.005);
      this.lastMouseX = event.clientX;
    }
    
    // Вертикальное движение мыши - наклон камеры (вверх/вниз)
    if (Math.abs(deltaY) > 2) {
      this.isoCamera.adjustPitch(deltaY * 0.003);
      this.lastMouseY = event.clientY;
    }
  };
  
  private onMouseWheel = (event: WheelEvent): void => {
    if (!this.isoCamera) return;
    
    // На мобильных зум отключен
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || ('ontouchstart' in window);
    if (isMobile) return;
    
    event.preventDefault();
    
    // Приближение/отдаление колёсиком мыши (только десктоп)
    const zoomSpeed = 0.15;
    if (event.deltaY > 0) {
      this.isoCamera.addZoom(-zoomSpeed);
    } else {
      this.isoCamera.addZoom(zoomSpeed);
    }
  };
  
  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys[event.code] = true;
    
    // E - взаимодействие
    if (event.code === 'KeyE' && this.player) {
      // Сначала проверяем двери
      this.toggleNearestDoor();
      
      // Потом интерактивные объекты
      const nearbyObject = this.interactiveObjects.find(obj => 
        obj.isInRange(this.player!.getPosition())
      );
      if (nearbyObject) {
        nearbyObject.interact();
      }
    }
    
    // F - открыть/закрыть дверь (альтернативная клавиша)
    if (event.code === 'KeyF' && this.player) {
      this.toggleNearestDoor();
    }
    
    // Q - вращение камеры влево
    if (event.code === 'KeyQ' && this.isoCamera) {
      this.isoCamera.rotateLeft();
    }
    
    // R - вращение камеры вправо  
    if (event.code === 'KeyR' && this.isoCamera) {
      this.isoCamera.rotateRight();
    }
    
    // T - наклон камеры вверх (вид сверху)
    if (event.code === 'KeyT' && this.isoCamera) {
      this.isoCamera.pitchUp();
    }
    
    // G - наклон камеры вниз (вид сбоку)
    if (event.code === 'KeyG' && this.isoCamera) {
      this.isoCamera.pitchDown();
    }
    
    // Escape - пауза
    if (event.code === 'Escape') {
      this.togglePause();
    }
    
    // Tab - инвентарь улик
    if (event.code === 'Tab') {
      event.preventDefault();
      this.showCluesInventory();
    }
  };
  
  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys[event.code] = false;
  };
  
  // Сброс всех клавиш когда окно теряет фокус
  private onBlur = (): void => {
    this.keys = {};
  };
  
  private getMovementVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    
    if (this.keys['KeyW'] || this.keys['ArrowUp']) z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    
    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }
    
    return { x, z };
  }
  
  private onMouseClick = (event: MouseEvent): void => {
    if (!this.isoCamera || !this.player || !this.groundPlane) return;
    if (GameStore.getState().gameState !== 'playing') return;
    
    // Игнорируем клики на UI
    if ((event.target as HTMLElement).closest('.dialogue-box, .clues-inventory, .pause-menu, .hud')) {
      return;
    }
    
    // Игнорируем правую и среднюю кнопку мыши
    if (event.button !== 0) return;
    
    // Получаем координаты клика относительно canvas
    const rect = (event.target as HTMLElement).getBoundingClientRect?.() || document.body.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    
    // Проверка клика на интерактивный объект
    const objectMeshes = this.interactiveObjects.map(obj => obj.mesh);
    const objectIntersects = this.raycaster.intersectObjects(objectMeshes, true);
    
    if (objectIntersects.length > 0) {
      let clickedMesh = objectIntersects[0].object;
      while (clickedMesh.parent && !objectMeshes.includes(clickedMesh as THREE.Group)) {
        clickedMesh = clickedMesh.parent;
      }
      
      const clickedObject = this.interactiveObjects.find(obj => obj.mesh === clickedMesh);
      if (clickedObject) {
        console.log('🖱️ Clicked on object:', clickedObject);
        this.player.moveTo(clickedObject.position.clone());
        return;
      }
    }
    
    // Клик на пол или модель комнаты - перемещение
    const groundIntersects = this.raycaster.intersectObject(this.groundPlane);
    if (groundIntersects.length > 0) {
      const point = groundIntersects[0].point;
      console.log('🖱️ Moving to:', point.x.toFixed(2), point.z.toFixed(2));
      this.player.moveTo(point);
      return;
    }
    
    // Пробуем клик на модель комнаты (офис)
    if (this.officeModel) {
      const officeIntersects = this.raycaster.intersectObject(this.officeModel, true);
      if (officeIntersects.length > 0) {
        const point = officeIntersects[0].point;
        // Корректируем Y на уровень пола
        point.y = 0.5;
        console.log('🖱️ Moving to office floor:', point.x.toFixed(2), point.z.toFixed(2));
        this.player.moveTo(point);
      }
    }
  };
  
  private showDialogue(text: string): void {
    this.dialogueElement?.remove();
    
    this.dialogueElement = document.createElement('div');
    this.dialogueElement.className = 'dialogue-box';
    this.dialogueElement.innerHTML = `
      <p>${text}</p>
      <button class="dialogue-close">Закрыть</button>
    `;
    document.body.appendChild(this.dialogueElement);
    
    this.dialogueElement.querySelector('.dialogue-close')?.addEventListener('click', () => {
      this.dialogueElement?.remove();
      this.dialogueElement = null;
    });
    
    setTimeout(() => {
      this.dialogueElement?.remove();
      this.dialogueElement = null;
    }, 8000);
  }
  
  private showCluesInventory(): void {
    document.querySelector('.clues-inventory')?.remove();
    
    const foundClues = GameStore.getState().foundClues;
    
    const inventory = document.createElement('div');
    inventory.className = 'clues-inventory';
    inventory.innerHTML = `
      <h2>🔍 Найденные улики (${foundClues.length}/3)</h2>
      <ul>
        ${foundClues.length > 0 
          ? foundClues.map(clueId => {
              const clue = this.interactiveObjects.find(obj => obj.id === clueId);
              return `<li><strong>${clue?.name || clueId}</strong><br>${clue?.description || ''}</li>`;
            }).join('')
          : '<li>Пока ничего не найдено. Исследуйте офис!</li>'
        }
      </ul>
      <button class="inventory-close">Закрыть (Tab)</button>
    `;
    document.body.appendChild(inventory);
    
    inventory.querySelector('.inventory-close')?.addEventListener('click', () => {
      inventory.remove();
    });
  }
  
  private togglePause(): void {
    const state = GameStore.getState();
    if (state.gameState === 'playing') {
      state.setGameState('paused');
      this.showPauseMenu();
    } else if (state.gameState === 'paused') {
      state.setGameState('playing');
      document.querySelector('.pause-menu')?.remove();
    }
  }
  
  private showPauseMenu(): void {
    const pauseMenu = document.createElement('div');
    pauseMenu.className = 'pause-menu';
    pauseMenu.innerHTML = `
      <div class="pause-content">
        <h2>⏸️ Пауза</h2>
        <button class="pause-btn" id="btn-resume">Продолжить</button>
        <button class="pause-btn" id="btn-main-menu">Главное меню</button>
      </div>
    `;
    document.body.appendChild(pauseMenu);
    
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.togglePause();
    });
    
    document.getElementById('btn-main-menu')?.addEventListener('click', async () => {
      pauseMenu.remove();
      GameStore.getState().resetGame();
      const { Game } = await import('../core/Game');
      const game = Game.getInstance();
      await game.sceneManager.loadScene('menu');
      game.setupRendererForCurrentScene();
    });
  }
  
  public async onEnter(): Promise<void> {
    console.log('🎮 Entering game scene');
    this.createHUD();
    GameStore.getState().setGameState('playing');
  }
  
  private createHUD(): void {
    this.hudElement?.remove();
    
    this.hudElement = document.createElement('div');
    this.hudElement.className = 'game-hud';
    this.hudElement.innerHTML = `
      <div class="hud-top">
        <span class="hud-title">🔍 Дело: Тайна старого особняка</span>
      </div>
      <div class="hud-bottom">
        <span class="hud-hint">WASD - движение | Колёсико - зум | Зажать колёсико + мышь - вращение | E - взаимодействие | Tab - улики</span>
      </div>
    `;
    document.body.appendChild(this.hudElement);
  }
  
  public async onExit(): Promise<void> {
    console.log('📤 Exiting game scene');
    
    window.removeEventListener('click', this.onMouseClick);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onMouseWheel);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchstart', this.onTouchStart2);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    
    // Очищаем мобильные контролы
    this.mobileControls?.destroy();
    
    this.hudElement?.remove();
    this.dialogueElement?.remove();
    document.querySelector('.pause-menu')?.remove();
    document.querySelector('.clues-inventory')?.remove();
  }
  
  public update(delta: number, elapsed: number): void {
    if (this.player && GameStore.getState().gameState === 'playing') {
      // Получаем ввод с клавиатуры
      let rawMovement = this.getMovementVector();
      let isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
      
      // Проверяем мобильный джойстик
      if (this.mobileControls && this.mobileControls.isActive()) {
        rawMovement = this.mobileControls.getMovement();
        isRunning = this.mobileControls.getIsRunning();
      }
      
      // Проверяем есть ли движение
      if (rawMovement.x !== 0 || rawMovement.z !== 0) {
        // Преобразуем движение с учётом поворота камеры
        const movement = this.isoCamera 
          ? this.isoCamera.getWorldDirection(rawMovement.x, rawMovement.z)
          : rawMovement;
        this.player.moveByDirection(movement, isRunning);
      } else if (!this.player.hasTargetPosition()) {
        // Нет ввода и нет цели от клика/тача - останавливаем
        this.player.stop();
      }
      
      this.player.update(delta);
      
      // Камера следует за игроком
      if (this.isoCamera) {
        this.isoCamera.followTarget(this.player.getPosition());
        this.isoCamera.update(delta);
      }
    } else if (this.isoCamera) {
      // Обновляем камеру даже на паузе (для плавности)
      this.isoCamera.update(delta);
    }
    
    // Обновление интерактивных объектов
    this.interactiveObjects.forEach(obj => {
      obj.update(delta, elapsed);
      
      if (this.player && obj.isInRange(this.player.getPosition())) {
        obj.highlight();
      } else {
        obj.unhighlight();
      }
    });
    
    // Обновление анимации дверей
    this.updateDoors(delta);
    
    // Обновление мерцания света
    this.updateFlickeringLights(elapsed);
  }
  
  public onResize(width: number, height: number): void {
    if (this.isoCamera) {
      this.isoCamera.onResize(width, height);
    }
  }
}
