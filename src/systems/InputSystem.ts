// ============================================
// СИСТЕМА ВВОДА
// ============================================

type KeyCallback = () => void;
type MouseCallback = (x: number, y: number, button: number) => void;

export class InputSystem {
  private keys: Map<string, boolean> = new Map();
  private keyDownCallbacks: Map<string, Set<KeyCallback>> = new Map();
  private keyUpCallbacks: Map<string, Set<KeyCallback>> = new Map();
  
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private mouseButtons: Map<number, boolean> = new Map();
  private mouseClickCallbacks: Set<MouseCallback> = new Set();
  private mouseMoveCallbacks: Set<MouseCallback> = new Set();
  
  private isEnabled: boolean = true;
  
  constructor() {
    this.setupKeyboardListeners();
    this.setupMouseListeners();
    console.log('🎮 Input system initialized');
  }
  
  // Настройка слушателей клавиатуры
  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }
  
  // Настройка слушателей мыши
  private setupMouseListeners(): void {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('click', this.onClick);
    window.addEventListener('contextmenu', this.onContextMenu);
  }
  
  // Обработчик нажатия клавиши
  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;
    
    const key = event.code;
    
    // Предотвращаем повторные срабатывания при зажатии
    if (this.keys.get(key)) return;
    
    this.keys.set(key, true);
    
    // Вызов callbacks
    const callbacks = this.keyDownCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  };
  
  // Обработчик отпускания клавиши
  private onKeyUp = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;
    
    const key = event.code;
    this.keys.set(key, false);
    
    // Вызов callbacks
    const callbacks = this.keyUpCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  };
  
  // Обработчик движения мыши
  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isEnabled) return;
    
    this.mousePosition.x = event.clientX;
    this.mousePosition.y = event.clientY;
    
    this.mouseMoveCallbacks.forEach(cb => {
      cb(event.clientX, event.clientY, -1);
    });
  };
  
  // Обработчик нажатия кнопки мыши
  private onMouseDown = (event: MouseEvent): void => {
    if (!this.isEnabled) return;
    this.mouseButtons.set(event.button, true);
  };
  
  // Обработчик отпускания кнопки мыши
  private onMouseUp = (event: MouseEvent): void => {
    if (!this.isEnabled) return;
    this.mouseButtons.set(event.button, false);
  };
  
  // Обработчик клика
  private onClick = (event: MouseEvent): void => {
    if (!this.isEnabled) return;
    
    this.mouseClickCallbacks.forEach(cb => {
      cb(event.clientX, event.clientY, event.button);
    });
  };
  
  // Блокировка контекстного меню
  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
  
  // Проверка нажатия клавиши
  public isKeyPressed(key: string): boolean {
    return this.keys.get(key) || false;
  }
  
  // Проверка нажатия кнопки мыши
  public isMouseButtonPressed(button: number): boolean {
    return this.mouseButtons.get(button) || false;
  }
  
  // Получение позиции мыши
  public getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }
  
  // Подписка на нажатие клавиши
  public onKeyPressed(key: string, callback: KeyCallback): void {
    if (!this.keyDownCallbacks.has(key)) {
      this.keyDownCallbacks.set(key, new Set());
    }
    this.keyDownCallbacks.get(key)!.add(callback);
  }
  
  // Отписка от нажатия клавиши
  public offKeyPressed(key: string, callback: KeyCallback): void {
    this.keyDownCallbacks.get(key)?.delete(callback);
  }
  
  // Подписка на отпускание клавиши
  public onKeyReleased(key: string, callback: KeyCallback): void {
    if (!this.keyUpCallbacks.has(key)) {
      this.keyUpCallbacks.set(key, new Set());
    }
    this.keyUpCallbacks.get(key)!.add(callback);
  }
  
  // Подписка на клик мыши
  public onMouseClick(callback: MouseCallback): void {
    this.mouseClickCallbacks.add(callback);
  }
  
  // Отписка от клика мыши
  public offMouseClick(callback: MouseCallback): void {
    this.mouseClickCallbacks.delete(callback);
  }
  
  // Подписка на движение мыши
  public onMouseMoveEvent(callback: MouseCallback): void {
    this.mouseMoveCallbacks.add(callback);
  }
  
  // Получение вектора движения (WASD/стрелки)
  public getMovementVector(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    
    if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) z -= 1;
    if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) z += 1;
    if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) x -= 1;
    if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) x += 1;
    
    // Нормализация для диагонального движения
    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }
    
    return { x, z };
  }
  
  // Включение/выключение системы ввода
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.mouseButtons.clear();
    }
  }
  
  // Очистка ресурсов
  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('click', this.onClick);
    window.removeEventListener('contextmenu', this.onContextMenu);
    
    this.keyDownCallbacks.clear();
    this.keyUpCallbacks.clear();
    this.mouseClickCallbacks.clear();
    this.mouseMoveCallbacks.clear();
    
    console.log('🗑️ Input system disposed');
  }
}
