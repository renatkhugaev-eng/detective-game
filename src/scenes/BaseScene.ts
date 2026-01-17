// ============================================
// БАЗОВЫЙ КЛАСС СЦЕНЫ
// ============================================

import * as THREE from 'three';

export abstract class BaseScene {
  public scene: THREE.Scene;
  public camera: THREE.Camera;
  
  protected isInitialized: boolean = false;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(); // Будет переопределено в наследниках
  }
  
  // Инициализация сцены (загрузка ресурсов)
  public abstract init(): Promise<void>;
  
  // Вызывается при входе в сцену
  public abstract onEnter(): Promise<void>;
  
  // Вызывается при выходе из сцены
  public abstract onExit(): Promise<void>;
  
  // Обновление каждый кадр
  public abstract update(delta: number, elapsed: number): void;
  
  // Обработка изменения размера
  public abstract onResize(width: number, height: number): void;
  
  // Очистка ресурсов
  public dispose(): void {
    // Очистка всех объектов сцены
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.scene.clear();
    this.isInitialized = false;
  }
}
