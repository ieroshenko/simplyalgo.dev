/**
 * Unit tests for LocalStorageService
 * Tests all storage operations, error scenarios, and edge cases
 */

import { 
  LocalStorageService, 
  StorageConfig, 
  OverlayPosition, 
  PositionStorage,
  DEFAULT_STORAGE_CONFIG,
  createLocalStorageService 
} from '../localStorageService';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

// Mock window.screen and window.innerWidth
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(window, 'screen', {
  value: { width: 1920, height: 1080 },
  writable: true
});

Object.defineProperty(window, 'innerWidth', {
  value: 1024,
  writable: true
});

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let config: StorageConfig;

  // Shared mock position for tests that need it
  const mockPosition: OverlayPosition = {
    x: 100,
    y: 200,
    timestamp: Date.now(),
    screenSize: { width: 1920, height: 1080 }
  };

  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
    
    config = {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      fallbackPosition: { x: 100, y: 100 }
    };
    
    service = new LocalStorageService(config);
  });

  describe('Basic Storage Operations', () => {
    test('should save and load data successfully', () => {
      const testData = { test: 'value', number: 42 };
      const key = 'test-key';

      const saveResult = service.save(key, testData);
      expect(saveResult).toBe(true);

      const loadedData = service.load(key);
      expect(loadedData).toEqual(testData);
    });

    test('should return null for non-existent keys', () => {
      const result = service.load('non-existent-key');
      expect(result).toBeNull();
    });

    test('should remove data successfully', () => {
      const testData = { test: 'value' };
      const key = 'test-key';

      service.save(key, testData);
      expect(service.load(key)).toEqual(testData);

      service.remove(key);
      expect(service.load(key)).toBeNull();
    });

    test('should handle null and undefined data', () => {
      expect(service.save('null-key', null)).toBe(false);
      expect(service.save('undefined-key', undefined)).toBe(false);
    });
  });

  describe('Data Validation', () => {
    test('should reject circular references', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      const result = service.save('circular-key', circularData);
      expect(result).toBe(false);
    });

    test('should handle valid JSON data', () => {
      const validData = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' }
      };

      const result = service.save('valid-key', validData);
      expect(result).toBe(true);

      const loaded = service.load('valid-key');
      expect(loaded).toEqual(validData);
    });
  });

  describe('Expiration Handling', () => {
    test('should detect expired timestamps', () => {
      const now = Date.now();
      const expiredTimestamp = now - (config.maxAge + 1000);
      const validTimestamp = now - 1000;

      expect(service.isExpired(expiredTimestamp)).toBe(true);
      expect(service.isExpired(validTimestamp)).toBe(false);
    });

    test('should remove expired data on load', () => {
      const expiredData = {
        timestamp: Date.now() - (config.maxAge + 1000),
        value: 'expired'
      };

      service.save('expired-key', expiredData);
      const result = service.load('expired-key');
      
      expect(result).toBeNull();
      expect(mockLocalStorage.getItem('expired-key')).toBeNull();
    });

    test('should load non-expired data', () => {
      const validData = {
        timestamp: Date.now() - 1000,
        value: 'valid'
      };

      service.save('valid-key', validData);
      const result = service.load('valid-key');
      
      expect(result).toEqual(validData);
    });
  });

  describe('Position-Specific Operations', () => {
    // Uses shared mockPosition defined at describe block level

    test('should save and load position for specific problem', () => {
      const problemId = 'test-problem-1';
      
      const saveResult = service.savePosition(problemId, mockPosition);
      expect(saveResult).toBe(true);

      const loadedPosition = service.loadPosition(problemId);
      expect(loadedPosition).toEqual(mockPosition);
    });

    test('should update lastUsed timestamp on load', () => {
      const problemId = 'test-problem-2';
      const originalTime = Date.now() - 5000;
      
      // Mock Date.now for consistent testing
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalTime);
      
      service.savePosition(problemId, mockPosition);
      
      // Advance time
      const newTime = originalTime + 10000;
      Date.now = jest.fn(() => newTime);
      
      service.loadPosition(problemId);
      
      const allPositions = service.getAllPositions();
      expect(allPositions?.[problemId]?.metadata.lastUsed).toBe(newTime);
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });

    test('should return null for non-existent problem position', () => {
      const result = service.loadPosition('non-existent-problem');
      expect(result).toBeNull();
    });

    test('should remove position for specific problem', () => {
      const problemId = 'test-problem-3';
      
      service.savePosition(problemId, mockPosition);
      expect(service.loadPosition(problemId)).toEqual(mockPosition);

      service.removePosition(problemId);
      expect(service.loadPosition(problemId)).toBeNull();
    });

    test('should handle multiple problem positions', () => {
      const position1: OverlayPosition = { ...mockPosition, x: 100 };
      const position2: OverlayPosition = { ...mockPosition, x: 200 };
      
      service.savePosition('problem-1', position1);
      service.savePosition('problem-2', position2);

      expect(service.loadPosition('problem-1')).toEqual(position1);
      expect(service.loadPosition('problem-2')).toEqual(position2);

      const allPositions = service.getAllPositions();
      expect(Object.keys(allPositions || {})).toHaveLength(2);
    });

    test('should clear all positions', () => {
      service.savePosition('problem-1', mockPosition);
      service.savePosition('problem-2', mockPosition);

      expect(service.getAllPositions()).not.toBeNull();

      service.clearAllPositions();
      expect(service.getAllPositions()).toBeNull();
    });
  });

  describe('Cleanup Operations', () => {
    test('should remove expired entries during cleanup', () => {
      const now = Date.now();
      const expiredPosition: OverlayPosition = {
        ...mockPosition,
        timestamp: now - (config.maxAge + 1000)
      };
      const validPosition: OverlayPosition = {
        ...mockPosition,
        timestamp: now - 1000
      };

      service.savePosition('expired-problem', expiredPosition);
      service.savePosition('valid-problem', validPosition);

      service.cleanup();

      expect(service.loadPosition('expired-problem')).toBeNull();
      expect(service.loadPosition('valid-problem')).toEqual(validPosition);
    });

    test('should handle cleanup with no data', () => {
      expect(() => service.cleanup()).not.toThrow();
    });

    test('should handle cleanup with all valid data', () => {
      service.savePosition('problem-1', mockPosition);
      service.savePosition('problem-2', mockPosition);

      const beforeCleanup = service.getAllPositions();
      service.cleanup();
      const afterCleanup = service.getAllPositions();

      expect(afterCleanup).toEqual(beforeCleanup);
    });
  });

  describe('Device Type Detection', () => {
    test('should detect mobile device', () => {
      // Mock mobile width
      Object.defineProperty(window, 'innerWidth', {
        value: 600,
        writable: true
      });

      service.savePosition('mobile-test', mockPosition);
      const allPositions = service.getAllPositions();
      
      expect(allPositions?.['mobile-test']?.metadata.deviceType).toBe('mobile');
    });

    test('should detect desktop device', () => {
      // Mock desktop width
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true
      });

      service.savePosition('desktop-test', mockPosition);
      const allPositions = service.getAllPositions();
      
      expect(allPositions?.['desktop-test']?.metadata.deviceType).toBe('desktop');
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage unavailable', () => {
      // Mock localStorage to throw error
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn(() => {
        throw new Error('localStorage unavailable');
      });

      const result = service.save('test-key', { test: 'data' });
      expect(result).toBe(false);

      // Restore original method
      mockLocalStorage.setItem = originalSetItem;
    });

    test('should handle corrupted data in localStorage', () => {
      // Manually set corrupted data
      mockLocalStorage.setItem('corrupted-key', 'invalid-json{');

      const result = service.load('corrupted-key');
      expect(result).toBeNull();
    });

    test('should handle localStorage getItem throwing error', () => {
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      const result = service.load('test-key');
      expect(result).toBeNull();

      // Restore original method
      mockLocalStorage.getItem = originalGetItem;
    });

    test('should handle localStorage removeItem throwing error', () => {
      const originalRemoveItem = mockLocalStorage.removeItem;
      mockLocalStorage.removeItem = jest.fn(() => {
        throw new Error('localStorage error');
      });

      expect(() => service.remove('test-key')).not.toThrow();

      // Restore original method
      mockLocalStorage.removeItem = originalRemoveItem;
    });
  });

  describe('Factory Function', () => {
    test('should create service with default config', () => {
      const defaultService = createLocalStorageService();
      expect(defaultService).toBeInstanceOf(LocalStorageService);
    });

    test('should create service with custom config', () => {
      const customConfig = {
        maxAge: 1000,
        fallbackPosition: { x: 50, y: 50 }
      };
      
      const customService = createLocalStorageService(customConfig);
      expect(customService).toBeInstanceOf(LocalStorageService);
    });

    test('should merge custom config with defaults', () => {
      const partialConfig = { maxAge: 5000 };
      const service = createLocalStorageService(partialConfig);
      
      // Test that the service works (indicating config was merged properly)
      const result = service.save('test', { data: 'test' });
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large data objects', () => {
      const largeData = {
        array: new Array(1000).fill('test-data-string'),
        timestamp: Date.now()
      };

      const result = service.save('large-data', largeData);
      expect(result).toBe(true);

      const loaded = service.load('large-data');
      expect(loaded).toEqual(largeData);
    });

    test('should handle special characters in keys', () => {
      const specialKey = 'test-key-with-special-chars-!@#$%^&*()';
      const testData = { value: 'test' };

      const result = service.save(specialKey, testData);
      expect(result).toBe(true);

      const loaded = service.load(specialKey);
      expect(loaded).toEqual(testData);
    });

    test('should handle empty objects and arrays', () => {
      const emptyObject = {};
      const emptyArray: any[] = [];

      expect(service.save('empty-object', emptyObject)).toBe(true);
      expect(service.save('empty-array', emptyArray)).toBe(true);

      expect(service.load('empty-object')).toEqual(emptyObject);
      expect(service.load('empty-array')).toEqual(emptyArray);
    });
  });
});

// Mock jest functions if not available (for environments without jest)
if (typeof jest === 'undefined') {
  (global as any).jest = {
    fn: (implementation?: (...args: any[]) => any) => {
      const mockFn = implementation || (() => {});
      (mockFn as any).mockImplementation = (impl: (...args: any[]) => any) => {
        Object.setPrototypeOf(mockFn, impl);
        return mockFn;
      };
      return mockFn;
    }
  };
}

if (typeof describe === 'undefined') {
  (global as any).describe = (name: string, fn: () => void) => {
    console.log(`Test Suite: ${name}`);
    fn();
  };
}

if (typeof test === 'undefined') {
  (global as any).test = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      console.error(`✗ ${name}:`, error);
    }
  };
}

if (typeof expect === 'undefined') {
  (global as any).expect = (actual: any) => ({
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected ${actual} to be null`);
      }
    },
    not: {
      toThrow: () => {
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          throw new Error(`Expected function not to throw, but it threw: ${error}`);
        }
      },
      toBeNull: () => {
        if (actual === null) {
          throw new Error(`Expected ${actual} not to be null`);
        }
      }
    }
  });
}

if (typeof beforeEach === 'undefined') {
  (global as any).beforeEach = (fn: () => void) => {
    // In a real test environment, this would run before each test
    // For now, we'll just call it once
    fn();
  };
}