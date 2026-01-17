// ============================================
// ИГРОВОЙ ЦИКЛ
// ============================================

import * as THREE from 'three';

type UpdateCallback = (delta: number, elapsed: number) => void;

export class Loop {
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  
  private updateCallbacks: Set<UpdateCallback> = new Set();
  private fixedUpdateCallbacks: Set<UpdateCallback> = new Set();
  
  // Фиксированный шаг для физики (60 FPS)
  private readonly FIXED_TIME_STEP = 1 / 60;
  private accumulator: number = 0;
  
  constructor() {
    this.clock = new THREE.Clock();
  }
  
  // Запуск цикла
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.tick();
    
    console.log('▶️ Game loop started');
  }
  
  // Остановка цикла
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clock.stop();
    
    console.log('⏸️ Game loop stopped');
  }
  
  // Основной тик
  private tick = (): void => {
    if (!this.isRunning) return;
    
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    
    // Фиксированное обновление (физика)
    this.accumulator += delta;
    while (this.accumulator >= this.FIXED_TIME_STEP) {
      this.fixedUpdateCallbacks.forEach(callback => {
        callback(this.FIXED_TIME_STEP, elapsed);
      });
      this.accumulator -= this.FIXED_TIME_STEP;
    }
    
    // Обычное обновление (логика, анимации, рендеринг)
    this.updateCallbacks.forEach(callback => {
      callback(delta, elapsed);
    });
    
    // Следующий кадр
    this.animationId = requestAnimationFrame(this.tick);
  };
  
  // Добавление callback для обновления
  public addUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.add(callback);
  }
  
  // Удаление callback
  public removeUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.delete(callback);
  }
  
  // Добавление callback для фиксированного обновления (физика)
  public addFixedUpdate(callback: UpdateCallback): void {
    this.fixedUpdateCallbacks.add(callback);
  }
  
  // Удаление callback фиксированного обновления
  public removeFixedUpdate(callback: UpdateCallback): void {
    this.fixedUpdateCallbacks.delete(callback);
  }
  
  // Проверка состояния
  public get running(): boolean {
    return this.isRunning;
  }
}
