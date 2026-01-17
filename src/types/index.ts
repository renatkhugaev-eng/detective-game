// ============================================
// ТИПЫ ДЛЯ ДЕТЕКТИВНОЙ ИГРЫ
// ============================================

import * as THREE from 'three';

// Состояния игры
export type GameState = 'loading' | 'menu' | 'playing' | 'paused' | 'dialogue' | 'investigating';

// Типы улик
export type ClueType = 'document' | 'object' | 'testimony' | 'photo' | 'fingerprint';

// Интерфейс улики
export interface Clue {
  id: string;
  name: string;
  description: string;
  type: ClueType;
  found: boolean;
  linkedClues: string[]; // ID связанных улик
  position?: THREE.Vector3;
  model?: THREE.Object3D;
}

// Интерфейс персонажа (NPC)
export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  dialogues: Dialogue[];
  position: THREE.Vector3;
  model?: THREE.Object3D;
  isSuspect: boolean;
  alibi?: string;
}

// Диалог
export interface Dialogue {
  id: string;
  text: string;
  speaker: string;
  responses?: DialogueResponse[];
  requiredClues?: string[]; // Улики, нужные для открытия диалога
  revealsClue?: string; // ID улики, которую раскрывает диалог
}

// Ответ в диалоге
export interface DialogueResponse {
  text: string;
  nextDialogueId?: string;
  effect?: () => void;
}

// Дело (кейс)
export interface Case {
  id: string;
  title: string;
  description: string;
  clues: Clue[];
  characters: Character[];
  solved: boolean;
  culprit: string; // ID виновного
}

// Настройки игры
export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  language: 'ru' | 'en';
  fullscreen: boolean;
}

// Сохранение игры
export interface SaveData {
  currentCase: string;
  foundClues: string[];
  talkedTo: string[];
  playerPosition: { x: number; y: number; z: number };
  gameTime: number;
  settings: GameSettings;
}

// Интерактивный объект
export interface InteractiveObject {
  id: string;
  type: 'clue' | 'npc' | 'door' | 'container';
  position: THREE.Vector3;
  interactionRadius: number;
  onInteract: () => void;
  mesh?: THREE.Mesh;
  isHighlighted: boolean;
}

// Событие игры
export interface GameEvent {
  type: string;
  payload?: any;
  timestamp: number;
}

// Локация
export interface Location {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  objects: InteractiveObject[];
  exits: { targetLocation: string; position: THREE.Vector3 }[];
}
