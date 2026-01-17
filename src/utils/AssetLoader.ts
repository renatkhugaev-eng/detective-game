// ============================================
// ЗАГРУЗЧИК АССЕТОВ
// ============================================

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

type LoadProgressCallback = (progress: number) => void;

export class AssetLoader {
  private textureLoader: THREE.TextureLoader;
  private gltfLoader: GLTFLoader;
  private audioLoader: THREE.AudioLoader;
  
  private textures: Map<string, THREE.Texture> = new Map();
  private models: Map<string, GLTF> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  
  private loadingManager: THREE.LoadingManager;
  private totalItems: number = 0;
  private loadedItems: number = 0;
  
  constructor() {
    // Менеджер загрузки для отслеживания прогресса
    this.loadingManager = new THREE.LoadingManager();
    
    this.loadingManager.onProgress = (url, loaded, total) => {
      this.loadedItems = loaded;
      this.totalItems = total;
    };
    
    // Инициализация загрузчиков
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.audioLoader = new THREE.AudioLoader(this.loadingManager);
    
    // Настройка DRACO для сжатых моделей
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(dracoLoader);
    
    console.log('📦 Asset loader initialized');
  }
  
  // Загрузка текстуры
  public async loadTexture(name: string, url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          this.textures.set(name, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`Failed to load texture: ${url}`, error);
          reject(error);
        }
      );
    });
  }
  
  // Загрузка 3D модели (GLTF/GLB)
  public async loadModel(name: string, url: string, onProgress?: (percent: number) => void): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          // Настройка теней для всех мешей
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          this.models.set(name, gltf);
          resolve(gltf);
        },
        (xhr) => {
          // Прогресс загрузки
          if (xhr.lengthComputable && onProgress) {
            const percent = (xhr.loaded / xhr.total) * 100;
            onProgress(percent);
          }
        },
        (error) => {
          console.error(`Failed to load model: ${url}`, error);
          reject(error);
        }
      );
    });
  }
  
  // Загрузка 3D модели с детальным прогрессом (байты)
  public async loadModelWithProgress(
    name: string, 
    url: string, 
    onProgress?: (percent: number, loaded: number, total: number) => void
  ): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      // Таймаут для мобильных устройств (3 минуты)
      const timeout = setTimeout(() => {
        reject(new Error(`Таймаут загрузки: ${url}`));
      }, 180000);
      
      console.log(`📥 Starting load: ${url}`);
      
      this.gltfLoader.load(
        url,
        (gltf) => {
          clearTimeout(timeout);
          console.log(`✅ Loaded: ${url}`);
          
          // Настройка теней для всех мешей (отключаем на мобильных для производительности)
          const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
          
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = !isMobile; // Отключаем тени на мобильных
              child.receiveShadow = !isMobile;
              
              // Оптимизация материалов для мобильных
              if (isMobile && child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    mat.precision = 'mediump';
                  });
                } else {
                  child.material.precision = 'mediump';
                }
              }
            }
          });
          
          this.models.set(name, gltf);
          resolve(gltf);
        },
        (xhr) => {
          // Прогресс загрузки с байтами
          if (onProgress) {
            const loaded = xhr.loaded;
            const total = xhr.lengthComputable ? xhr.total : xhr.loaded * 1.1;
            const percent = xhr.lengthComputable ? (loaded / total) * 100 : Math.min(loaded / 50000000 * 100, 99);
            onProgress(percent, loaded, total);
            
            // Логируем прогресс каждые 10%
            if (Math.floor(percent) % 10 === 0) {
              console.log(`📦 ${name}: ${percent.toFixed(0)}%`);
            }
          }
        },
        (error) => {
          clearTimeout(timeout);
          console.error(`❌ Failed to load model: ${url}`, error);
          reject(new Error(`Ошибка загрузки модели: ${name}`));
        }
      );
    });
  }
  
  // Загрузка аудио
  public async loadAudio(name: string, url: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => {
          this.audioBuffers.set(name, buffer);
          resolve(buffer);
        },
        undefined,
        (error) => {
          console.error(`Failed to load audio: ${url}`, error);
          reject(error);
        }
      );
    });
  }
  
  // Пакетная загрузка
  public async loadAll(
    assets: {
      textures?: { name: string; url: string }[];
      models?: { name: string; url: string }[];
      audio?: { name: string; url: string }[];
    },
    onProgress?: LoadProgressCallback
  ): Promise<void> {
    const promises: Promise<any>[] = [];
    
    // Текстуры
    if (assets.textures) {
      assets.textures.forEach(({ name, url }) => {
        promises.push(this.loadTexture(name, url));
      });
    }
    
    // Модели
    if (assets.models) {
      assets.models.forEach(({ name, url }) => {
        promises.push(this.loadModel(name, url));
      });
    }
    
    // Аудио
    if (assets.audio) {
      assets.audio.forEach(({ name, url }) => {
        promises.push(this.loadAudio(name, url));
      });
    }
    
    // Отслеживание прогресса
    if (onProgress) {
      this.loadingManager.onProgress = (url, loaded, total) => {
        onProgress(loaded / total);
      };
    }
    
    await Promise.all(promises);
  }
  
  // Получение загруженной текстуры
  public getTexture(name: string): THREE.Texture | undefined {
    return this.textures.get(name);
  }
  
  // Получение загруженной модели
  public getModel(name: string): GLTF | undefined {
    return this.models.get(name);
  }
  
  // Клонирование модели (для создания нескольких экземпляров)
  public cloneModel(name: string): THREE.Object3D | undefined {
    const gltf = this.models.get(name);
    if (!gltf) return undefined;
    
    return gltf.scene.clone();
  }
  
  // Получение аудио буфера
  public getAudioBuffer(name: string): AudioBuffer | undefined {
    return this.audioBuffers.get(name);
  }
  
  // Получение прогресса загрузки
  public getProgress(): number {
    if (this.totalItems === 0) return 1;
    return this.loadedItems / this.totalItems;
  }
  
  // Очистка ресурсов
  public dispose(): void {
    this.textures.forEach(texture => texture.dispose());
    this.textures.clear();
    
    this.models.forEach(gltf => {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.models.clear();
    
    this.audioBuffers.clear();
    
    console.log('🗑️ Asset loader disposed');
  }
}
