// ============================================
// АУДИО СИСТЕМА
// ============================================

import { Howl, Howler } from 'howler';

interface SoundConfig {
  src: string[];
  volume?: number;
  loop?: boolean;
  sprite?: { [key: string]: [number, number] };
}

export class AudioSystem {
  private sounds: Map<string, Howl> = new Map();
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private currentMusic: Howl | null = null;
  
  constructor() {
    // Глобальные настройки Howler
    Howler.autoUnlock = true;
    console.log('🔊 Audio system initialized');
  }
  
  // Загрузка звука
  public loadSound(name: string, config: SoundConfig): void {
    const sound = new Howl({
      src: config.src,
      volume: config.volume ?? this.sfxVolume,
      loop: config.loop ?? false,
      sprite: config.sprite,
    });
    
    this.sounds.set(name, sound);
  }
  
  // Воспроизведение звука
  public playSound(name: string, sprite?: string): number | undefined {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound "${name}" not found`);
      return undefined;
    }
    
    return sound.play(sprite);
  }
  
  // Остановка звука
  public stopSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.stop();
    }
  }
  
  // Воспроизведение музыки
  public playMusic(name: string, fadeIn: number = 1000): void {
    // Остановка текущей музыки
    if (this.currentMusic) {
      this.currentMusic.fade(this.musicVolume, 0, fadeIn);
      setTimeout(() => {
        this.currentMusic?.stop();
      }, fadeIn);
    }
    
    const music = this.sounds.get(name);
    if (!music) {
      console.warn(`Music "${name}" not found`);
      return;
    }
    
    music.volume(0);
    music.loop(true);
    music.play();
    music.fade(0, this.musicVolume, fadeIn);
    
    this.currentMusic = music;
  }
  
  // Остановка музыки
  public stopMusic(fadeOut: number = 1000): void {
    if (this.currentMusic) {
      this.currentMusic.fade(this.musicVolume, 0, fadeOut);
      setTimeout(() => {
        this.currentMusic?.stop();
        this.currentMusic = null;
      }, fadeOut);
    }
  }
  
  // Установка громкости музыки
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume(this.musicVolume);
    }
  }
  
  // Установка громкости звуковых эффектов
  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }
  
  // Получение громкости
  public getMusicVolume(): number {
    return this.musicVolume;
  }
  
  public getSfxVolume(): number {
    return this.sfxVolume;
  }
  
  // Глобальное отключение звука
  public mute(): void {
    Howler.mute(true);
  }
  
  // Включение звука
  public unmute(): void {
    Howler.mute(false);
  }
  
  // Пауза всех звуков
  public pauseAll(): void {
    this.sounds.forEach(sound => sound.pause());
  }
  
  // Возобновление всех звуков
  public resumeAll(): void {
    this.sounds.forEach(sound => {
      if (sound.playing()) return;
      sound.play();
    });
  }
  
  // Очистка ресурсов
  public dispose(): void {
    this.sounds.forEach(sound => {
      sound.unload();
    });
    this.sounds.clear();
    this.currentMusic = null;
    console.log('🗑️ Audio system disposed');
  }
}
