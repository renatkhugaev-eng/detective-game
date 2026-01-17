// ============================================
// ИНТЕРАКТИВНЫЙ ОБЪЕКТ (УЛИКИ, NPC, ДВЕРИ)
// ============================================

import * as THREE from 'three';

export type InteractiveType = 'clue' | 'npc' | 'door' | 'container';

export interface InteractiveConfig {
  id: string;
  type: InteractiveType;
  name: string;
  description: string;
  position: THREE.Vector3;
  interactionRadius?: number;
  onInteract?: () => void;
}

export class InteractiveObject {
  public id: string;
  public type: InteractiveType;
  public name: string;
  public description: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public interactionRadius: number;
  
  private isHighlighted: boolean = false;
  private highlightMesh: THREE.Mesh | null = null;
  private onInteractCallback: (() => void) | null = null;
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  
  constructor(config: InteractiveConfig) {
    this.id = config.id;
    this.type = config.type;
    this.name = config.name;
    this.description = config.description;
    this.position = config.position.clone();
    this.interactionRadius = config.interactionRadius ?? 1.5;
    this.onInteractCallback = config.onInteract ?? null;
    
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    
    // Создание визуала в зависимости от типа
    this.createVisual();
    
    // Создание подсветки
    this.createHighlight();
  }
  
  // Создание визуала объекта
  private createVisual(): void {
    switch (this.type) {
      case 'clue':
        this.createClueVisual();
        break;
      case 'npc':
        this.createNPCVisual();
        break;
      case 'door':
        this.createDoorVisual();
        break;
      case 'container':
        this.createContainerVisual();
        break;
    }
  }
  
  // Визуал улики (светящийся объект)
  private createClueVisual(): void {
    const geometry = new THREE.OctahedronGeometry(0.15);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.5;
    mesh.castShadow = true;
    this.mesh.add(mesh);
    
    // Анимация вращения
    this.mesh.userData.animate = (delta: number, elapsed: number) => {
      mesh.rotation.y += delta;
      mesh.position.y = 0.5 + Math.sin(elapsed * 2) * 0.1;
    };
  }
  
  // Визуал NPC (простая фигура человека)
  private createNPCVisual(): void {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      roughness: 0.7,
    });
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.8,
    });
    
    // Тело
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.7, 8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.55;
    body.castShadow = true;
    this.mesh.add(body);
    
    // Голова
    const headGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.y = 1.05;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Ноги
    const legGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2f2f });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.1, 0.2, 0);
    this.mesh.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.1, 0.2, 0);
    this.mesh.add(rightLeg);
  }
  
  // Визуал двери
  private createDoorVisual(): void {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.7,
    });
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
    });
    
    // Рама
    const frameGeometry = new THREE.BoxGeometry(1.2, 2.2, 0.1);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = 1.1;
    this.mesh.add(frame);
    
    // Дверь
    const doorGeometry = new THREE.BoxGeometry(1, 2, 0.08);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.y = 1;
    door.position.z = 0.02;
    door.castShadow = true;
    this.mesh.add(door);
    
    // Ручка
    const handleGeometry = new THREE.SphereGeometry(0.05);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0.35, 1, 0.1);
    this.mesh.add(handle);
  }
  
  // Визуал контейнера (ящик/сундук)
  private createContainerVisual(): void {
    const material = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.8,
    });
    
    const geometry = new THREE.BoxGeometry(0.6, 0.4, 0.4);
    const box = new THREE.Mesh(geometry, material);
    box.position.y = 0.2;
    box.castShadow = true;
    box.receiveShadow = true;
    this.mesh.add(box);
    
    // Крышка
    const lidGeometry = new THREE.BoxGeometry(0.65, 0.08, 0.45);
    const lid = new THREE.Mesh(lidGeometry, material);
    lid.position.y = 0.44;
    lid.castShadow = true;
    this.mesh.add(lid);
  }
  
  // Создание подсветки для выделения
  private createHighlight(): void {
    const geometry = new THREE.RingGeometry(0.4, 0.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.highlightMesh = new THREE.Mesh(geometry, material);
    this.highlightMesh.rotation.x = -Math.PI / 2;
    this.highlightMesh.position.y = 0.02;
    this.mesh.add(this.highlightMesh);
  }
  
  // Включение подсветки
  public highlight(): void {
    if (this.isHighlighted) return;
    this.isHighlighted = true;
    
    if (this.highlightMesh) {
      (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
    }
  }
  
  // Выключение подсветки
  public unhighlight(): void {
    if (!this.isHighlighted) return;
    this.isHighlighted = false;
    
    if (this.highlightMesh) {
      (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }
  
  // Взаимодействие с объектом
  public interact(): void {
    console.log(`Interacting with: ${this.name}`);
    if (this.onInteractCallback) {
      this.onInteractCallback();
    }
  }
  
  // Проверка расстояния до игрока
  public isInRange(playerPosition: THREE.Vector3): boolean {
    const distance = this.position.distanceTo(playerPosition);
    return distance <= this.interactionRadius;
  }
  
  // Обновление (для анимаций)
  public update(delta: number, elapsed: number): void {
    if (this.mesh.userData.animate) {
      this.mesh.userData.animate(delta, elapsed);
    }
    
    // Анимация подсветки
    if (this.isHighlighted && this.highlightMesh) {
      this.highlightMesh.rotation.z += delta;
      const pulse = 0.4 + Math.sin(elapsed * 4) * 0.1;
      (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }
  
  // Установка callback взаимодействия
  public setOnInteract(callback: () => void): void {
    this.onInteractCallback = callback;
  }
}
