// ============================================
// ХРАНИЛИЩЕ СОСТОЯНИЯ ИГРЫ (Zustand)
// ============================================

import { createStore } from 'zustand/vanilla';
import { GameState, Clue, Character, Case, GameSettings, SaveData } from '../types';

interface GameStoreState {
  // Состояние игры
  gameState: GameState;
  setGameState: (state: GameState) => void;
  
  // Текущее дело
  currentCase: Case | null;
  setCurrentCase: (caseData: Case) => void;
  
  // Найденные улики
  foundClues: string[];
  addFoundClue: (clueId: string) => void;
  hasClue: (clueId: string) => boolean;
  
  // Персонажи, с которыми поговорили
  talkedTo: string[];
  addTalkedTo: (characterId: string) => void;
  hasTalkedTo: (characterId: string) => boolean;
  
  // Текущий диалог
  currentDialogue: string | null;
  setCurrentDialogue: (dialogueId: string | null) => void;
  
  // Выбранный объект
  selectedObject: string | null;
  setSelectedObject: (objectId: string | null) => void;
  
  // Настройки
  settings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;
  
  // Время игры
  gameTime: number;
  addGameTime: (delta: number) => void;
  
  // Сохранение/загрузка
  saveGame: () => SaveData;
  loadGame: (data: SaveData) => void;
  
  // Сброс состояния
  resetGame: () => void;
}

const defaultSettings: GameSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  language: 'ru',
  fullscreen: false,
};

export const GameStore = createStore<GameStoreState>((set, get) => ({
  // Состояние игры
  gameState: 'loading',
  setGameState: (state) => set({ gameState: state }),
  
  // Текущее дело
  currentCase: null,
  setCurrentCase: (caseData) => set({ currentCase: caseData }),
  
  // Найденные улики
  foundClues: [],
  addFoundClue: (clueId) => set((state) => ({
    foundClues: state.foundClues.includes(clueId) 
      ? state.foundClues 
      : [...state.foundClues, clueId]
  })),
  hasClue: (clueId) => get().foundClues.includes(clueId),
  
  // Персонажи
  talkedTo: [],
  addTalkedTo: (characterId) => set((state) => ({
    talkedTo: state.talkedTo.includes(characterId)
      ? state.talkedTo
      : [...state.talkedTo, characterId]
  })),
  hasTalkedTo: (characterId) => get().talkedTo.includes(characterId),
  
  // Диалог
  currentDialogue: null,
  setCurrentDialogue: (dialogueId) => set({ currentDialogue: dialogueId }),
  
  // Выбранный объект
  selectedObject: null,
  setSelectedObject: (objectId) => set({ selectedObject: objectId }),
  
  // Настройки
  settings: defaultSettings,
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
  
  // Время игры
  gameTime: 0,
  addGameTime: (delta) => set((state) => ({
    gameTime: state.gameTime + delta
  })),
  
  // Сохранение
  saveGame: () => {
    const state = get();
    return {
      currentCase: state.currentCase?.id || '',
      foundClues: state.foundClues,
      talkedTo: state.talkedTo,
      playerPosition: { x: 0, y: 0, z: 0 }, // Будет обновляться из игры
      gameTime: state.gameTime,
      settings: state.settings,
    };
  },
  
  // Загрузка
  loadGame: (data) => set({
    foundClues: data.foundClues,
    talkedTo: data.talkedTo,
    gameTime: data.gameTime,
    settings: data.settings,
  }),
  
  // Сброс
  resetGame: () => set({
    gameState: 'menu',
    currentCase: null,
    foundClues: [],
    talkedTo: [],
    currentDialogue: null,
    selectedObject: null,
    gameTime: 0,
  }),
}));
