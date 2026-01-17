// ============================================
// ИГРОК (ДЕТЕКТИВ) - С АНИМИРОВАННОЙ 3D МОДЕЛЬЮ
// ============================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Game } from '../core/Game';

export class Player {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 | null = null;
  
  public readonly speed: number = 30;
  public readonly runSpeed: number = 60;
  public readonly interactionRadius: number = 15;
  public readonly collisionRadius: number = 3;
  
  // Ускорение/торможение
  private acceleration: number = 25;
  private deceleration: number = 20;
  private currentSpeed: number = 0;
  private targetSpeed: number = 0;
  
  private isMoving: boolean = false;
  private isRunning: boolean = false;
  private facingDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private collisionBoxes: THREE.Box3[] = [];
  
  // Высота пола (Y координата)
  private floorY: number = 0.5;
  
  // 3D модель и анимация
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;
  private currentAnimName: string = '';
  
  // Масштаб модели
  private modelScale: number = 1.0;
  
  // Флаг загрузки
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;
  
  constructor() {
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 0);
    
    // Создаём временный placeholder
    this.createPlaceholder();
    
    // Загружаем анимированную модель (сохраняем промис)
    this.loadPromise = this.loadAnimatedModel().catch(err => {
      console.error('❌ Failed to load player model:', err);
    });
  }
  
  // Ожидание загрузки модели
  public async waitForLoad(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
    }
  }
  
  // Временная модель пока грузится основная
  private createPlaceholder(): void {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8, 8);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5
    });
    const placeholder = new THREE.Mesh(geometry, material);
    placeholder.position.y = 0.9;
    placeholder.name = 'placeholder';
    this.mesh.add(placeholder);
  }
  
  // Загрузка анимированной модели
  private async loadAnimatedModel(): Promise<void> {
    const loader = new GLTFLoader();
    
    console.log('👤 Loading animated detective model...');
    
    try {
      // Пробуем получить предзагруженную модель
      let gltf = Game.getInstance().assets.getModel('detective');
      
      if (gltf) {
        console.log('⚡ Using cached detective model!');
      } else {
        console.log('📥 Loading detective model from file...');
        // Fallback: загружаем напрямую
        gltf = await this.loadGLTF(loader, '/models/detective/detective.glb');
      }
      
      if (!gltf || !gltf.scene) {
        throw new Error('Detective model is empty or invalid');
      }
      
      // Очищаем mesh
      while (this.mesh.children.length > 0) {
        this.mesh.remove(this.mesh.children[0]);
      }
      
      const model = gltf.scene;
      this.model = model;
      
      // Настройка масштаба
      model.scale.set(this.modelScale, this.modelScale, this.modelScale);
      
      // Центрируем модель
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      
      // Смещаем модель чтобы ноги были на уровне 0
      model.position.y = -box.min.y * this.modelScale;
      
      console.log(`📏 Model size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
      
      // Включаем тени
      model.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Добавляем модель
      this.mesh.add(model);
      
      // Создаём AnimationMixer для корня модели
      this.mixer = new THREE.AnimationMixer(model);
      
      // Загружаем все анимации
      console.log(`🎬 Found ${gltf.animations.length} animations:`);
      
      gltf.animations.forEach((clip: THREE.AnimationClip, index: number) => {
        console.log(`  [${index}] "${clip.name}" - ${clip.duration.toFixed(2)}s`);
        
        // Нормализуем имя
        let animName = clip.name.toLowerCase();
        
        // Определяем тип анимации по ключевым словам
        if (animName.includes('idle') && !this.actions.has('idle')) {
          animName = 'idle';
        } else if (animName.includes('walk') && !this.actions.has('walk')) {
          animName = 'walk';
        } else if ((animName.includes('run') || animName.includes('running')) && !this.actions.has('run')) {
          animName = 'run';
        } else {
          // Пропускаем дубликаты
          console.log(`    → Skipped (duplicate)`);
          return;
        }
        
        // Убираем root motion (перемещение) из анимации
        const tracks: THREE.KeyframeTrack[] = [];
        
        clip.tracks.forEach(track => {
          const trackName = track.name.toLowerCase();
          
          // Полностью убираем позицию Hips (root motion)
          if (trackName.includes('hips') && trackName.includes('position')) {
            return; // Пропускаем
          }
          
          // Для других позиций — оставляем только X и Z, обнуляем Y если это Hips
          tracks.push(track);
        });
        
        // Создаём новый клип без root motion
        const cleanClip = new THREE.AnimationClip(clip.name, clip.duration, tracks);
        
        const action = this.mixer!.clipAction(cleanClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        
        // Сохраняем
        this.actions.set(animName, action);
        console.log(`    → Mapped to "${animName}"`);
      });
      
      // Запускаем idle
      if (this.actions.has('idle')) {
        this.playAnimation('idle');
      } else if (gltf.animations.length > 0) {
        // Если нет idle, берём первую анимацию
        this.playAnimation(gltf.animations[0].name);
      }
      
      this.isLoaded = true;
      console.log('✅ Detective model fully loaded!');
      console.log('🎬 Available animations:', Array.from(this.actions.keys()));
      
    } catch (error) {
      console.error('❌ Error loading model:', error);
      this.createFallbackModel();
    }
  }
  
  // Загрузка GLTF файла (Promise)
  private loadGLTF(loader: GLTFLoader, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf),
        () => {
          // Прогресс загрузки (без логов)
        },
        (error) => reject(error)
      );
    });
  }
  
  // Воспроизведение анимации
  private playAnimation(name: string): void {
    if (!this.mixer) return;
    if (this.currentAnimName === name) return;
    
    const newAction = this.actions.get(name);
    if (!newAction) {
      console.warn(`Animation "${name}" not found`);
      return;
    }
    
    console.log(`🎬 Playing: ${name}`);
    
    // Плавный переход
    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }
    
    newAction.reset();
    newAction.setEffectiveTimeScale(1);
    newAction.setEffectiveWeight(1);
    newAction.fadeIn(0.2);
    newAction.play();
    
    this.currentAction = newAction;
    this.currentAnimName = name;
  }
  
  // Запасная модель
  private createFallbackModel(): void {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }
    
    const coatMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4a3d });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
    
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 0.8, 8),
      coatMaterial
    );
    body.position.y = 0.6;
    body.castShadow = true;
    this.mesh.add(body);
    
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      skinMaterial
    );
    head.position.y = 1.15;
    head.castShadow = true;
    this.mesh.add(head);
    
    const hatBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16),
      hatMaterial
    );
    hatBrim.position.y = 1.32;
    this.mesh.add(hatBrim);
    
    const hatTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.14, 16),
      hatMaterial
    );
    hatTop.position.y = 1.42;
    this.mesh.add(hatTop);
    
    this.isLoaded = true;
    console.log('⚠️ Using fallback model');
  }
  
  // Движение к точке (клик мышью)
  public moveTo(target: THREE.Vector3): void {
    this.targetPosition = target.clone();
    this.targetPosition.y = this.floorY;
    this.isMoving = true;
    this.isRunning = false;
    this.targetSpeed = this.speed;
    this.currentSpeed = this.speed; // Сразу начинаем движение!
    
    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, this.position)
      .normalize();
    
    if (direction.lengthSq() > 0) {
      this.facingDirection.copy(direction);
      this.targetRotation = Math.atan2(direction.x, direction.z);
    }
  }
  
  public setFloorY(y: number): void {
    this.floorY = y;
    this.position.y = y;
  }
  
  public setCollisionBoxes(boxes: THREE.Box3[]): void {
    this.collisionBoxes = boxes;
  }
  
  // Проверка коллизии и получение вектора выталкивания
  private checkCollisionWithPush(newX: number, newZ: number): { collision: boolean; pushVector: THREE.Vector3 } {
    const playerHeight = 20;
    const result = { collision: false, pushVector: new THREE.Vector3() };
    
    const playerBox = new THREE.Box3(
      new THREE.Vector3(newX - this.collisionRadius, this.floorY, newZ - this.collisionRadius),
      new THREE.Vector3(newX + this.collisionRadius, this.floorY + playerHeight, newZ + this.collisionRadius)
    );
    
    for (const box of this.collisionBoxes) {
      if (playerBox.intersectsBox(box)) {
        result.collision = true;
        
        // Вычисляем вектор выталкивания
        const playerCenter = new THREE.Vector3(newX, this.floorY, newZ);
        const boxCenter = new THREE.Vector3();
        box.getCenter(boxCenter);
        
        // Направление от центра препятствия к игроку
        const pushDir = playerCenter.clone().sub(boxCenter);
        pushDir.y = 0; // Только горизонтально
        pushDir.normalize();
        
        // Сила выталкивания
        result.pushVector.add(pushDir.multiplyScalar(2));
      }
    }
    
    return result;
  }
  
  // Простая проверка коллизии (для совместимости)
  private checkCollision(newX: number, newZ: number): boolean {
    return this.checkCollisionWithPush(newX, newZ).collision;
  }
  
  // Счётчик застревания
  private stuckCounter: number = 0;
  
  // Выталкивание из препятствий (вызывается каждый кадр)
  private pushOutOfCollisions(): void {
    const check = this.checkCollisionWithPush(this.position.x, this.position.z);
    
    if (check.collision) {
      this.stuckCounter++;
      
      if (check.pushVector.length() > 0) {
        // Увеличенная сила выталкивания
        const pushStrength = 5;
        const newX = this.position.x + check.pushVector.x * pushStrength;
        const newZ = this.position.z + check.pushVector.z * pushStrength;
        
        // Проверяем, что новая позиция свободна
        if (!this.checkCollision(newX, newZ)) {
          this.position.x = newX;
          this.position.z = newZ;
          this.stuckCounter = 0;
        } else {
          // Пробуем по осям отдельно
          if (!this.checkCollision(newX, this.position.z)) {
            this.position.x = newX;
            this.stuckCounter = 0;
          } else if (!this.checkCollision(this.position.x, newZ)) {
            this.position.z = newZ;
            this.stuckCounter = 0;
          }
        }
      }
      
      // Если застряли надолго — телепортируем в безопасное место
      if (this.stuckCounter > 60) { // ~1 секунда при 60fps
        console.log('⚠️ Player stuck! Emergency teleport...');
        this.emergencyUnstuck();
        this.stuckCounter = 0;
      }
    } else {
      this.stuckCounter = 0;
    }
  }
  
  // Экстренный телепорт в безопасное место
  private emergencyUnstuck(): void {
    // Пробуем найти свободное место рядом
    const directions = [
      { x: 10, z: 0 },
      { x: -10, z: 0 },
      { x: 0, z: 10 },
      { x: 0, z: -10 },
      { x: 10, z: 10 },
      { x: -10, z: -10 },
      { x: 10, z: -10 },
      { x: -10, z: 10 },
      { x: 20, z: 0 },
      { x: -20, z: 0 },
      { x: 0, z: 20 },
      { x: 0, z: -20 },
    ];
    
    for (const dir of directions) {
      const testX = this.position.x + dir.x;
      const testZ = this.position.z + dir.z;
      
      if (!this.checkCollision(testX, testZ)) {
        this.position.x = testX;
        this.position.z = testZ;
        console.log(`✅ Teleported to (${testX.toFixed(1)}, ${testZ.toFixed(1)})`);
        return;
      }
    }
    
    // Если совсем не нашли — телепортируем далеко
    this.position.x += 50;
    console.log('⚠️ Force teleported far away');
  }
  
  // Целевой угол поворота
  private targetRotation: number = 0;
  private rotationSpeed: number = 12; // Скорость поворота
  
  // Направление движения (нормализованное)
  private moveDirection: THREE.Vector3 = new THREE.Vector3();
  
  // Движение по направлению (WASD)
  public moveByDirection(direction: { x: number; z: number }, running: boolean = false): void {
    if (direction.x === 0 && direction.z === 0) {
      this.isMoving = false;
      this.isRunning = false;
      this.targetSpeed = 0;
      return;
    }
    
    this.targetPosition = null;
    this.isMoving = true;
    this.isRunning = running;
    
    // Устанавливаем целевую скорость
    this.targetSpeed = running ? this.runSpeed : this.speed;
    
    // Сохраняем направление
    this.moveDirection.set(direction.x, 0, direction.z).normalize();
    
    // Устанавливаем целевой угол
    this.targetRotation = Math.atan2(direction.x, direction.z);
  }
  
  public stop(): void {
    this.isMoving = false;
    this.isRunning = false;
    this.targetPosition = null;
    this.velocity.set(0, 0, 0);
    this.targetSpeed = 0;
    this.currentSpeed = 0; // Сразу останавливаемся
  }
  
  public update(delta: number): void {
    // Обновляем анимации
    if (this.mixer) {
      this.mixer.update(delta);
    }
    
    // Плавное ускорение/торможение
    if (this.currentSpeed < this.targetSpeed) {
      this.currentSpeed = Math.min(this.currentSpeed + this.acceleration * delta, this.targetSpeed);
    } else if (this.currentSpeed > this.targetSpeed) {
      this.currentSpeed = Math.max(this.currentSpeed - this.deceleration * delta, this.targetSpeed);
    }
    
    let newX = this.position.x;
    let newZ = this.position.z;
    
    if (this.targetPosition) {
      // Движение к точке (клик мышью)
      const direction = new THREE.Vector3()
        .subVectors(this.targetPosition, this.position);
      
      direction.y = 0;
      const distance = direction.length();
      
      if (distance < 0.15) {
        this.targetPosition = null;
        this.isMoving = false;
        this.targetSpeed = 0;
      } else {
        direction.normalize();
        
        // Используем currentSpeed для плавного ускорения
        const moveDistance = this.currentSpeed * delta;
        
        newX = this.position.x + direction.x * moveDistance;
        newZ = this.position.z + direction.z * moveDistance;
        
        // Обновляем целевой угол
        this.targetRotation = Math.atan2(direction.x, direction.z);
      }
    } else if (this.isMoving && this.currentSpeed > 0.01) {
      // Движение по WASD
      newX = this.position.x + this.moveDirection.x * this.currentSpeed * delta;
      newZ = this.position.z + this.moveDirection.z * this.currentSpeed * delta;
    }
    
    // Проверяем коллизии
    const actuallyMoving = this.isMoving || this.targetPosition || this.currentSpeed > 0.01;
    if (actuallyMoving) {
      if (!this.checkCollision(newX, this.position.z)) {
        this.position.x = newX;
      } else if (this.targetPosition) {
        this.targetPosition = null;
        this.isMoving = false;
        this.targetSpeed = 0;
      }
      
      if (!this.checkCollision(this.position.x, newZ)) {
        this.position.z = newZ;
      } else if (this.targetPosition) {
        this.targetPosition = null;
        this.isMoving = false;
        this.targetSpeed = 0;
      }
    }
    
    this.position.y = this.floorY;
    
    // Выталкиваем из препятствий если застрял
    this.pushOutOfCollisions();
    
    this.mesh.position.copy(this.position);
    
    // Плавный поворот
    if (this.isMoving || this.currentSpeed > 0.01) {
      let currentRotation = this.mesh.rotation.y;
      let diff = this.targetRotation - currentRotation;
      
      // Нормализуем разницу углов (-PI до PI)
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      
      // Плавно поворачиваем
      if (Math.abs(diff) > 0.01) {
        this.mesh.rotation.y += diff * Math.min(1, this.rotationSpeed * delta);
      } else {
        this.mesh.rotation.y = this.targetRotation;
      }
    }
    
    // Переключение анимаций
    if (this.isLoaded) {
      if (this.isMoving) {
        if (this.isRunning && this.actions.has('run')) {
          this.playAnimation('run');
        } else if (this.actions.has('walk')) {
          this.playAnimation('walk');
        }
      } else {
        if (this.actions.has('idle')) {
          this.playAnimation('idle');
        }
      }
    }
  }
  
  public getIsMoving(): boolean {
    return this.isMoving;
  }
  
  public hasTargetPosition(): boolean {
    return this.targetPosition !== null;
  }
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.mesh.position.copy(position);
    
    // Выталкиваем если спавнимся внутри препятствия
    setTimeout(() => {
      for (let i = 0; i < 10; i++) {
        this.pushOutOfCollisions();
      }
      this.mesh.position.copy(this.position);
    }, 100);
  }
  
  public setScale(scale: number): void {
    this.modelScale = scale;
    this.mesh.scale.set(scale, scale, scale);
  }
  
  public getAnimationNames(): string[] {
    return Array.from(this.actions.keys());
  }
}
