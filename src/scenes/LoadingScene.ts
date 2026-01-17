// ============================================
// СЦЕНА ЗАГРУЗКИ
// ============================================

import * as THREE from 'three';
import { BaseScene } from './BaseScene';

export class LoadingScene extends BaseScene {
  private loadingText: THREE.Mesh | null = null;
  
  constructor() {
    super();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
  }
  
  public async init(): Promise<void> {
    // Простой фон
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    // Можно добавить анимированный индикатор загрузки
    const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffd700,
      side: THREE.DoubleSide 
    });
    this.loadingText = new THREE.Mesh(geometry, material);
    this.scene.add(this.loadingText);
    
    this.isInitialized = true;
  }
  
  public async onEnter(): Promise<void> {
    console.log('📥 Entering loading scene');
  }
  
  public async onExit(): Promise<void> {
    console.log('📤 Exiting loading scene');
  }
  
  public update(delta: number, elapsed: number): void {
    // Вращение индикатора загрузки
    if (this.loadingText) {
      this.loadingText.rotation.z -= delta * 2;
    }
  }
  
  public onResize(width: number, height: number): void {
    // Ничего не нужно для ортографической камеры
  }
}
