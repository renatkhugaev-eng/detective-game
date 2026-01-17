// ============================================
// ПРОФЕССИОНАЛЬНАЯ ИЗОМЕТРИЧЕСКАЯ КАМЕРА 2.5D
// ============================================

import * as THREE from 'three';

export class IsometricCamera {
  public camera: THREE.OrthographicCamera;
  
  // Цель камеры (куда смотрит)
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Зум
  private zoom: number = 1;
  private targetZoom: number = 1;
  private minZoom: number = 0.3;  // Можно отдалить сильнее
  private maxZoom: number = 3.0;  // Можно приблизить сильнее
  private frustumSize: number = 10;
  
  // Вращение камеры (дискретное, по 45°)
  private rotationIndex: number = 0; // 0, 1, 2, 3, 4, 5, 6, 7 (8 направлений по 45°)
  private currentRotation: number = 0;
  private targetRotation: number = 0;
  
  // Расстояние камеры от цели
  private distance: number = 30;
  
  // Угол наклона (вертикальный)
  private pitch: number = Math.atan(1 / Math.sqrt(2)); // ~35.264° - классический изометрический угол
  private targetPitch: number = Math.atan(1 / Math.sqrt(2));
  private minPitch: number = 0.1; // Почти сверху
  private maxPitch: number = Math.PI / 2.5; // Почти сбоку
  
  // Плавность (damping)
  private followSmoothness: number = 0.08;
  private zoomSmoothness: number = 0.1;
  private rotationSmoothness: number = 0.08;
  
  // Границы камеры (опционально)
  private bounds: THREE.Box3 | null = null;
  
  // Эффект тряски камеры
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeTime: number = 0;
  
  private isMobile: boolean = false;
  
  constructor(width: number, height: number) {
    const aspect = width / height;
    
    // Определяем мобильное устройство
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || ('ontouchstart' in window)
      || width < 768;
    
    // Адаптируем камеру под устройство
    if (this.isMobile) {
      // Мобильные: адаптивный frustumSize в зависимости от ориентации
      const isLandscape = width > height;
      
      if (isLandscape) {
        // Горизонтальная ориентация
        this.frustumSize = 200;
      } else {
        // Вертикальная ориентация
        this.frustumSize = 300;
      }
      
      this.zoom = 1;
      this.targetZoom = 1;
      this.minZoom = 1;
      this.maxZoom = 1;
    } else {
      // Десктоп — для большой модели x10
      this.frustumSize = 150;
    }
    
    this.camera = new THREE.OrthographicCamera(
      -this.frustumSize * aspect / 2,
      this.frustumSize * aspect / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      -500,  // Ближняя плоскость (отрицательная для ортографической камеры)
      2000   // Дальняя плоскость
    );
    
    // Начальная позиция
    this.updateCameraPosition();
    
    console.log(`📷 Isometric camera initialized (mobile: ${this.isMobile}, frustum: ${this.frustumSize.toFixed(1)})`);
  }
  
  // Обновление позиции камеры на основе цели и вращения
  private updateCameraPosition(): void {
    // Вычисляем позицию камеры на основе угла вращения и наклона
    const horizontalAngle = this.currentRotation;
    const verticalAngle = this.pitch;
    
    // Позиция камеры относительно цели
    const offsetX = this.distance * Math.cos(verticalAngle) * Math.sin(horizontalAngle);
    const offsetY = this.distance * Math.sin(verticalAngle);
    const offsetZ = this.distance * Math.cos(verticalAngle) * Math.cos(horizontalAngle);
    
    // Применяем тряску если есть
    let shakeX = 0, shakeY = 0, shakeZ = 0;
    if (this.shakeTime > 0) {
      const shakeProgress = this.shakeTime / this.shakeDuration;
      const intensity = this.shakeIntensity * shakeProgress;
      shakeX = (Math.random() - 0.5) * intensity;
      shakeY = (Math.random() - 0.5) * intensity * 0.5;
      shakeZ = (Math.random() - 0.5) * intensity;
    }
    
    this.camera.position.set(
      this.currentTarget.x + offsetX + shakeX,
      this.currentTarget.y + offsetY + shakeY,
      this.currentTarget.z + offsetZ + shakeZ
    );
    
    this.camera.lookAt(this.currentTarget);
  }
  
  // Обновление frustum при зуме
  private updateFrustum(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const size = this.frustumSize / this.zoom;
    
    this.camera.left = -size * aspect / 2;
    this.camera.right = size * aspect / 2;
    this.camera.top = size / 2;
    this.camera.bottom = -size / 2;
    this.camera.updateProjectionMatrix();
  }
  
  // Главный метод обновления (вызывать каждый кадр)
  public update(delta: number): void {
    // Плавное следование за целью
    this.currentTarget.lerp(this.target, this.followSmoothness);
    
    // Применяем границы если заданы
    if (this.bounds) {
      this.currentTarget.clamp(this.bounds.min, this.bounds.max);
    }
    
    // Плавный зум
    this.zoom = THREE.MathUtils.lerp(this.zoom, this.targetZoom, this.zoomSmoothness);
    this.updateFrustum();
    
    // Плавное вращение
    // Обрабатываем переход через 0/2π
    let rotationDiff = this.targetRotation - this.currentRotation;
    if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
    this.currentRotation += rotationDiff * this.rotationSmoothness;
    
    // Нормализуем угол
    if (this.currentRotation > Math.PI * 2) this.currentRotation -= Math.PI * 2;
    if (this.currentRotation < 0) this.currentRotation += Math.PI * 2;
    
    // Плавный наклон (pitch)
    const pitchDiff = this.targetPitch - this.pitch;
    this.pitch += pitchDiff * this.rotationSmoothness;
    
    // Обновляем тряску
    if (this.shakeTime > 0) {
      this.shakeTime -= delta;
    }
    
    // Обновляем позицию камеры
    this.updateCameraPosition();
  }
  
  // ==================== ПУБЛИЧНЫЕ МЕТОДЫ ====================
  
  // Следование за целью (плавное)
  public followTarget(targetPosition: THREE.Vector3, smoothness?: number): void {
    if (smoothness !== undefined) {
      this.followSmoothness = smoothness;
    }
    this.target.copy(targetPosition);
  }
  
  // Мгновенная установка цели
  public setTarget(targetPosition: THREE.Vector3): void {
    this.target.copy(targetPosition);
    this.currentTarget.copy(targetPosition);
    this.updateCameraPosition();
  }
  
  // Зум
  public setZoom(zoom: number): void {
    this.targetZoom = THREE.MathUtils.clamp(zoom, this.minZoom, this.maxZoom);
  }
  
  public addZoom(delta: number): void {
    this.setZoom(this.targetZoom + delta);
  }
  
  public getZoom(): number {
    return this.zoom;
  }
  
  // Вращение камеры (дискретное по 45°)
  public rotateLeft(): void {
    this.rotationIndex = (this.rotationIndex + 1) % 8;
    this.targetRotation = this.rotationIndex * (Math.PI / 4);
    console.log(`📷 Camera rotation: ${this.rotationIndex * 45}°`);
  }
  
  public rotateRight(): void {
    this.rotationIndex = (this.rotationIndex - 1 + 8) % 8;
    this.targetRotation = this.rotationIndex * (Math.PI / 4);
    console.log(`📷 Camera rotation: ${this.rotationIndex * 45}°`);
  }
  
  // Наклон камеры вверх (смотреть более сверху)
  public pitchUp(): void {
    this.targetPitch = Math.max(this.minPitch, this.targetPitch - 0.15);
    console.log(`📷 Camera pitch: ${(this.targetPitch * 180 / Math.PI).toFixed(1)}°`);
  }
  
  // Наклон камеры вниз (смотреть более сбоку)
  public pitchDown(): void {
    this.targetPitch = Math.min(this.maxPitch, this.targetPitch + 0.15);
    console.log(`📷 Camera pitch: ${(this.targetPitch * 180 / Math.PI).toFixed(1)}°`);
  }
  
  // Плавный наклон (для тач-управления)
  public adjustPitch(delta: number): void {
    this.targetPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.targetPitch + delta));
  }
  
  // Плавное вращение (для тач-управления)
  public rotate(deltaAngle: number): void {
    this.targetRotation += deltaAngle;
    this.currentRotation += deltaAngle * 0.5; // Мгновенный отклик
    
    // Нормализуем углы
    while (this.targetRotation > Math.PI * 2) this.targetRotation -= Math.PI * 2;
    while (this.targetRotation < 0) this.targetRotation += Math.PI * 2;
    while (this.currentRotation > Math.PI * 2) this.currentRotation -= Math.PI * 2;
    while (this.currentRotation < 0) this.currentRotation += Math.PI * 2;
    
    // Обновляем rotationIndex для консистентности
    this.rotationIndex = Math.round(this.targetRotation / (Math.PI / 4)) % 8;
  }
  
  // Установка конкретного угла вращения (0-7, каждый шаг = 45°)
  public setRotationIndex(index: number): void {
    this.rotationIndex = index % 8;
    this.targetRotation = this.rotationIndex * (Math.PI / 4);
  }
  
  // Получение текущего угла вращения (для корректировки движения персонажа)
  public getRotationAngle(): number {
    return this.currentRotation;
  }
  
  // Тряска камеры (для эффектов)
  public shake(intensity: number = 0.5, duration: number = 0.3): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = duration;
  }
  
  // Установка границ камеры
  public setBounds(min: THREE.Vector3, max: THREE.Vector3): void {
    this.bounds = new THREE.Box3(min, max);
  }
  
  public clearBounds(): void {
    this.bounds = null;
  }
  
  // Изменение плавности
  public setSmoothness(follow: number, zoom: number, rotation: number): void {
    this.followSmoothness = follow;
    this.zoomSmoothness = zoom;
    this.rotationSmoothness = rotation;
  }
  
  // Обработка изменения размера экрана
  public onResize(width: number, height: number): void {
    const aspect = width / height;
    
    // На мобильных адаптируем frustumSize под ориентацию
    if (this.isMobile) {
      const isLandscape = width > height;
      if (isLandscape) {
        this.frustumSize = 200; // Горизонтальная
      } else {
        this.frustumSize = 300; // Вертикальная
      }
    }
    
    const size = this.frustumSize / this.zoom;
    
    this.camera.left = -size * aspect / 2;
    this.camera.right = size * aspect / 2;
    this.camera.top = size / 2;
    this.camera.bottom = -size / 2;
    this.camera.updateProjectionMatrix();
    
    console.log(`📷 Camera resized: ${width}x${height}, frustum: ${this.frustumSize}`);
  }
  
  // Преобразование экранных координат в мировые (для клика)
  public screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    const rect = document.body.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    
    // Пересечение с плоскостью Y=0
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    
    return intersection;
  }
  
  // Получение направления движения с учётом поворота камеры
  public getWorldDirection(inputX: number, inputZ: number): { x: number; z: number } {
    // Поворачиваем вектор ввода на угол камеры
    const angle = this.currentRotation;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    return {
      x: inputX * cos + inputZ * sin,
      z: -inputX * sin + inputZ * cos
    };
  }
}
