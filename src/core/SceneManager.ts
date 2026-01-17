// ============================================
// МЕНЕДЖЕР СЦЕН
// ============================================

import * as THREE from 'three';
import { BaseScene } from '../scenes/BaseScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';
import { LoadingScene } from '../scenes/LoadingScene';

type SceneName = 'loading' | 'menu' | 'game';

export class SceneManager {
  private scenes: Map<SceneName, BaseScene> = new Map();
  private currentScene: BaseScene | null = null;
  private currentSceneName: SceneName | null = null;
  
  constructor() {
    // Регистрация сцен
    this.scenes.set('loading', new LoadingScene());
    this.scenes.set('menu', new MenuScene());
    this.scenes.set('game', new GameScene());
    
    console.log('🎬 SceneManager initialized');
  }
  
  // Загрузка сцены
  public async loadScene(name: SceneName): Promise<void> {
    console.log(`🎬 Loading scene: ${name}`);
    
    // Выгрузка текущей сцены
    if (this.currentScene) {
      await this.currentScene.onExit();
      this.currentScene.dispose();
    }
    
    // Получение новой сцены
    const scene = this.scenes.get(name);
    if (!scene) {
      throw new Error(`Scene "${name}" not found`);
    }
    
    // Инициализация и вход в сцену
    await scene.init();
    await scene.onEnter();
    
    this.currentScene = scene;
    this.currentSceneName = name;
    
    console.log(`✅ Scene "${name}" loaded`);
  }
  
  // Получение текущей сцены
  public getCurrentScene(): BaseScene | null {
    return this.currentScene;
  }
  
  // Получение Three.js сцены
  public getThreeScene(): THREE.Scene | null {
    return this.currentScene?.scene || null;
  }
  
  // Получение камеры
  public getCamera(): THREE.Camera | null {
    return this.currentScene?.camera || null;
  }
  
  // Обновление сцены
  public update(delta: number, elapsed: number): void {
    if (this.currentScene) {
      this.currentScene.update(delta, elapsed);
    }
  }
  
  // Обработка изменения размера
  public onResize(width: number, height: number): void {
    if (this.currentScene) {
      this.currentScene.onResize(width, height);
    }
  }
  
  // Получение имени текущей сцены
  public getCurrentSceneName(): SceneName | null {
    return this.currentSceneName;
  }
}
