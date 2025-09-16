/**
 * LocalStorageService - Utility class for managing position data persistence
 * Handles save, load, remove, and cleanup operations with expiration and validation
 */

export interface StorageConfig {
  maxAge: number; // milliseconds
  fallbackPosition: { x: number; y: number };
}

export interface OverlayPosition {
  x: number;
  y: number;
  timestamp: number;
  screenSize: { width: number; height: number };
}

export interface PositionMetadata {
  createdAt: number;
  lastUsed: number;
  deviceType: 'mobile' | 'desktop';
  screenResolution: string;
}

export interface PositionStorage {
  [problemId: string]: {
    position: OverlayPosition;
    metadata: PositionMetadata;
  };
}

export class LocalStorageService {
  private config: StorageConfig;
  private readonly STORAGE_KEY = 'coach_overlay_positions';

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * Save data to localStorage with validation and error handling
   */
  save<T>(key: string, data: T): boolean {
    try {
      if (!this.isLocalStorageAvailable()) {
        return false;
      }

      if (!this.validateData(data)) {
        return false;
      }

      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      return true;
    } catch (error) {
      console.warn('LocalStorageService: Failed to save data', error);
      return false;
    }
  }

  /**
   * Load data from localStorage with validation and expiration check
   */
  load<T>(key: string): T | null {
    try {
      if (!this.isLocalStorageAvailable()) {
        return null;
      }

      const serializedData = localStorage.getItem(key);
      if (!serializedData) {
        return null;
      }

      const data = JSON.parse(serializedData) as T;
      
      // Check if data has timestamp and is expired
      if (this.hasTimestamp(data) && this.isExpired(data.timestamp)) {
        this.remove(key);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('LocalStorageService: Failed to load data', error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   */
  remove(key: string): void {
    try {
      if (!this.isLocalStorageAvailable()) {
        return;
      }

      localStorage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorageService: Failed to remove data', error);
    }
  }

  /**
   * Check if timestamp is expired based on maxAge configuration
   */
  isExpired(timestamp: number): boolean {
    const now = Date.now();
    return (now - timestamp) > this.config.maxAge;
  }

  /**
   * Clean up expired entries from localStorage
   */
  cleanup(): void {
    try {
      if (!this.isLocalStorageAvailable()) {
        return;
      }

      const positionData = this.load<PositionStorage>(this.STORAGE_KEY);
      if (!positionData) {
        return;
      }

      const cleanedData: PositionStorage = {};
      let hasExpiredEntries = false;

      Object.entries(positionData).forEach(([problemId, entry]) => {
        if (!this.isExpired(entry.position.timestamp)) {
          cleanedData[problemId] = entry;
        } else {
          hasExpiredEntries = true;
        }
      });

      if (hasExpiredEntries) {
        this.save(this.STORAGE_KEY, cleanedData);
      }
    } catch (error) {
      console.warn('LocalStorageService: Failed to cleanup expired entries', error);
    }
  }

  /**
   * Save position data for a specific problem
   */
  savePosition(problemId: string, position: OverlayPosition): boolean {
    const positionData = this.load<PositionStorage>(this.STORAGE_KEY) || {};
    
    const metadata: PositionMetadata = {
      createdAt: positionData[problemId]?.metadata.createdAt || Date.now(),
      lastUsed: Date.now(),
      deviceType: this.getDeviceType(),
      screenResolution: typeof window !== 'undefined' && window.screen 
        ? `${window.screen.width}x${window.screen.height}` 
        : '1920x1080'
    };

    positionData[problemId] = {
      position,
      metadata
    };

    return this.save(this.STORAGE_KEY, positionData);
  }

  /**
   * Load position data for a specific problem
   */
  loadPosition(problemId: string): OverlayPosition | null {
    const positionData = this.load<PositionStorage>(this.STORAGE_KEY);
    if (!positionData || !positionData[problemId]) {
      return null;
    }

    const entry = positionData[problemId];
    
    // Update last used timestamp
    entry.metadata.lastUsed = Date.now();
    this.save(this.STORAGE_KEY, positionData);

    return entry.position;
  }

  /**
   * Remove position data for a specific problem
   */
  removePosition(problemId: string): void {
    const positionData = this.load<PositionStorage>(this.STORAGE_KEY);
    if (!positionData || !positionData[problemId]) {
      return;
    }

    delete positionData[problemId];
    this.save(this.STORAGE_KEY, positionData);
  }

  /**
   * Get all stored position data
   */
  getAllPositions(): PositionStorage | null {
    return this.load<PositionStorage>(this.STORAGE_KEY);
  }

  /**
   * Clear all position data
   */
  clearAllPositions(): void {
    this.remove(this.STORAGE_KEY);
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate data before saving
   */
  private validateData<T>(data: T): boolean {
    if (data === null || data === undefined) {
      return false;
    }

    try {
      JSON.stringify(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if data has timestamp property
   */
  private hasTimestamp(data: unknown): data is { timestamp: number } {
    return data !== null && 
           typeof data === 'object' && 
           data !== undefined &&
           'timestamp' in data && 
           typeof (data as { timestamp: unknown }).timestamp === 'number';
  }

  /**
   * Determine device type based on screen width
   */
  private getDeviceType(): 'mobile' | 'desktop' {
    if (typeof window === 'undefined') {
      return 'desktop'; // Default to desktop in non-browser environments
    }
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  }

  /**
   * Get all localStorage keys (for cleanup purposes)
   */
  getAllKeys(): string[] {
    try {
      if (!this.isLocalStorageAvailable()) {
        return [];
      }

      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.warn('LocalStorageService: Failed to get all keys', error);
      return [];
    }
  }
}

/**
 * Default configuration for LocalStorageService
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  fallbackPosition: { x: 0, y: 0 }
};

/**
 * Create a default instance of LocalStorageService
 */
export const createLocalStorageService = (config?: Partial<StorageConfig>): LocalStorageService => {
  const finalConfig = { ...DEFAULT_STORAGE_CONFIG, ...config };
  return new LocalStorageService(finalConfig);
};