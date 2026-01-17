// ============================================
// МОБИЛЬНОЕ УПРАВЛЕНИЕ - Виртуальный джойстик
// ============================================

import nipplejs, { JoystickManager } from 'nipplejs';

export interface JoystickData {
  x: number;  // -1 до 1
  z: number;  // -1 до 1
  active: boolean;
}

export class MobileControls {
  private joystick: JoystickManager | null = null;
  private joystickData: JoystickData = { x: 0, z: 0, active: false };
  private container: HTMLElement | null = null;
  private runButton: HTMLElement | null = null;
  private isRunning: boolean = false;
  
  // Определяем мобильное устройство
  public static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || ('ontouchstart' in window);
  }
  
  constructor() {
    if (MobileControls.isMobile()) {
      this.createControls();
    }
  }
  
  private createControls(): void {
    // Контейнер для джойстика (левая часть экрана)
    this.container = document.createElement('div');
    this.container.id = 'joystick-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 150px;
      height: 150px;
      z-index: 1000;
      touch-action: none;
    `;
    document.body.appendChild(this.container);
    
    // Создаём джойстик
    this.joystick = nipplejs.create({
      zone: this.container,
      mode: 'static',
      position: { left: '75px', top: '75px' },
      color: 'rgba(255, 255, 255, 0.5)',
      size: 120,
      restOpacity: 0.5,
    });
    
    // Обработчики джойстика
    this.joystick.on('move', (_evt: unknown, data: nipplejs.JoystickOutputData) => {
      if (data.vector) {
        this.joystickData.x = data.vector.x;
        this.joystickData.z = -data.vector.y; // Инвертируем Y для Z
        this.joystickData.active = true;
      }
    });
    
    this.joystick.on('end', () => {
      this.joystickData.x = 0;
      this.joystickData.z = 0;
      this.joystickData.active = false;
    });
    
    // Кнопка бега (правая часть экрана)
    this.runButton = document.createElement('div');
    this.runButton.id = 'run-button';
    this.runButton.innerHTML = '🏃';
    this.runButton.style.cssText = `
      position: fixed;
      bottom: 40px;
      right: 40px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      border: 3px solid rgba(255, 255, 255, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      z-index: 1000;
      touch-action: none;
      user-select: none;
      transition: background 0.2s;
    `;
    document.body.appendChild(this.runButton);
    
    // Обработчики кнопки бега
    this.runButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isRunning = true;
      this.runButton!.style.background = 'rgba(255, 100, 100, 0.5)';
    });
    
    this.runButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isRunning = false;
      this.runButton!.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    
    console.log('📱 Mobile controls initialized');
  }
  
  public getMovement(): { x: number; z: number } {
    return { x: this.joystickData.x, z: this.joystickData.z };
  }
  
  public isActive(): boolean {
    return this.joystickData.active;
  }
  
  public getIsRunning(): boolean {
    return this.isRunning;
  }
  
  public destroy(): void {
    if (this.joystick) {
      this.joystick.destroy();
    }
    this.container?.remove();
    this.runButton?.remove();
  }
}
