// ============================================
// РЕНДЕРЕР
// ============================================

import * as THREE from 'three';

export class Renderer {
  public renderer: THREE.WebGLRenderer;
  
  private container: HTMLElement;
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Создание WebGL рендерера
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    
    // Настройки рендерера
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Включаем clipping planes для обрезки крыши
    this.renderer.localClippingEnabled = true;
    
    // Добавление canvas в контейнер
    container.appendChild(this.renderer.domElement);
    
    console.log('🎨 Renderer initialized');
  }
  
  // Настройка пост-обработки для сцены (опционально)
  public setupPostProcessing(scene: THREE.Scene, camera: THREE.Camera): void {
    console.log('✨ Post-processing ready (using direct render)');
  }
  
  // Рендеринг кадра
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }
  
  // Рендеринг без пост-обработки
  public renderDirect(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }
  
  // Изменение размера
  public setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }
  
  // Получение canvas
  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }
  
  // Очистка ресурсов
  public dispose(): void {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    console.log('🗑️ Renderer disposed');
  }
}
