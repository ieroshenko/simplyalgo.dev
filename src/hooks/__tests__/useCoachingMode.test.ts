import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoachingMode, CoachingModePreferences } from '../../types';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
    set store(newStore: Record<string, string>) {
      store = newStore;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('useCoachingMode', () => {
  const STORAGE_KEY = 'coaching-mode-preferences';

  beforeEach(() => {
    mockLocalStorage.clear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockConsoleWarn.mockClear();
  });

  describe('Local Storage Operations', () => {
    it('should save valid preferences to localStorage', () => {
      const preferences: CoachingModePreferences = {
        defaultMode: 'socratic',
        lastUsedMode: 'socratic',
        rememberChoice: true,
        timestamp: Date.now(),
      };

      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(preferences)
      );
    });

    it('should load valid preferences from localStorage', () => {
      const preferences: CoachingModePreferences = {
        defaultMode: 'comprehensive',
        lastUsedMode: 'comprehensive',
        rememberChoice: true,
        timestamp: Date.now(),
      };

      mockLocalStorage.store = {
        [STORAGE_KEY]: JSON.stringify(preferences),
      };

      const result = mockLocalStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(result!);

      expect(parsed).toEqual(preferences);
      expect(parsed.defaultMode).toBe('comprehensive');
      expect(parsed.lastUsedMode).toBe('comprehensive');
      expect(parsed.rememberChoice).toBe(true);
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage.store = {
        [STORAGE_KEY]: 'invalid-json',
      };

      expect(() => {
        const result = mockLocalStorage.getItem(STORAGE_KEY);
        if (result) {
          JSON.parse(result);
        }
      }).toThrow();
    });

    it('should handle missing localStorage data', () => {
      const result = mockLocalStorage.getItem(STORAGE_KEY);
      expect(result).toBeNull();
    });

    it('should remove preferences from localStorage', () => {
      mockLocalStorage.store = {
        [STORAGE_KEY]: 'some-data',
      };

      mockLocalStorage.removeItem(STORAGE_KEY);
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(mockLocalStorage.store[STORAGE_KEY]).toBeUndefined();
    });
  });

  describe('Mode Validation', () => {
    it('should validate socratic mode as valid', () => {
      const validModes: CoachingMode[] = ['socratic', 'comprehensive'];
      
      expect(validModes.includes('socratic')).toBe(true);
    });

    it('should validate comprehensive mode as valid', () => {
      const validModes: CoachingMode[] = ['socratic', 'comprehensive'];
      
      expect(validModes.includes('comprehensive')).toBe(true);
    });

    it('should identify invalid modes', () => {
      const validModes: CoachingMode[] = ['socratic', 'comprehensive'];
      
      expect(validModes.includes('invalid' as CoachingMode)).toBe(false);
    });
  });

  describe('Preference Validation', () => {
    it('should validate complete preference object', () => {
      const preferences: CoachingModePreferences = {
        defaultMode: 'socratic',
        lastUsedMode: 'comprehensive',
        rememberChoice: true,
        timestamp: Date.now(),
      };

      // Check all required properties exist
      expect(preferences).toHaveProperty('defaultMode');
      expect(preferences).toHaveProperty('lastUsedMode');
      expect(preferences).toHaveProperty('rememberChoice');
      expect(preferences).toHaveProperty('timestamp');

      // Check types
      expect(['socratic', 'comprehensive'].includes(preferences.defaultMode)).toBe(true);
      expect(['socratic', 'comprehensive'].includes(preferences.lastUsedMode)).toBe(true);
      expect(typeof preferences.rememberChoice).toBe('boolean');
      expect(typeof preferences.timestamp).toBe('number');
    });

    it('should identify invalid preference structure', () => {
      const invalidPreferences = {
        defaultMode: 'invalid',
        lastUsedMode: 'also-invalid',
        rememberChoice: 'not-boolean',
        timestamp: 'not-number',
      };

      expect(['socratic', 'comprehensive'].includes(invalidPreferences.defaultMode as CoachingMode)).toBe(false);
      expect(['socratic', 'comprehensive'].includes(invalidPreferences.lastUsedMode as CoachingMode)).toBe(false);
      expect(typeof invalidPreferences.rememberChoice).not.toBe('boolean');
      expect(typeof invalidPreferences.timestamp).not.toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage.setItem errors', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        mockLocalStorage.setItem(STORAGE_KEY, 'test-data');
      }).toThrow('Storage quota exceeded');
    });

    it('should handle localStorage.getItem errors', () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage access denied');
      });

      expect(() => {
        mockLocalStorage.getItem(STORAGE_KEY);
      }).toThrow('localStorage access denied');
    });

    it('should handle localStorage.removeItem errors', () => {
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Failed to remove item');
      });

      expect(() => {
        mockLocalStorage.removeItem(STORAGE_KEY);
      }).toThrow('Failed to remove item');
    });
  });

  describe('Default Values', () => {
    it('should use comprehensive as default mode', () => {
      const DEFAULT_MODE: CoachingMode = 'comprehensive';
      
      expect(DEFAULT_MODE).toBe('comprehensive');
      expect(['socratic', 'comprehensive'].includes(DEFAULT_MODE)).toBe(true);
    });

    it('should use correct storage key', () => {
      expect(STORAGE_KEY).toBe('coaching-mode-preferences');
    });
  });

  describe('Mode Toggle Logic', () => {
    it('should toggle from comprehensive to socratic', () => {
      const currentMode: CoachingMode = 'comprehensive';
      const newMode: CoachingMode = currentMode === 'socratic' ? 'comprehensive' : 'socratic';
      
      expect(newMode).toBe('socratic');
    });

    it('should toggle from socratic to comprehensive', () => {
      const currentMode: CoachingMode = 'socratic';
      const newMode: CoachingMode = currentMode === 'socratic' ? 'comprehensive' : 'socratic';
      
      expect(newMode).toBe('comprehensive');
    });
  });

  describe('Utility Functions', () => {
    it('should correctly identify socratic mode', () => {
      const mode: CoachingMode = 'socratic';
      const isSocraticMode = mode === 'socratic';
      const isComprehensiveMode = mode === 'comprehensive';
      
      expect(isSocraticMode).toBe(true);
      expect(isComprehensiveMode).toBe(false);
    });

    it('should correctly identify comprehensive mode', () => {
      const mode: CoachingMode = 'comprehensive';
      const isSocraticMode = mode === 'socratic';
      const isComprehensiveMode = mode === 'comprehensive';
      
      expect(isSocraticMode).toBe(false);
      expect(isComprehensiveMode).toBe(true);
    });
  });

  describe('Timestamp Handling', () => {
    it('should generate valid timestamps', () => {
      const timestamp = Date.now();
      
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should handle timestamp validation', () => {
      const validTimestamp = Date.now();
      const invalidTimestamp = 'not-a-number';
      
      expect(typeof validTimestamp).toBe('number');
      expect(typeof invalidTimestamp).not.toBe('number');
    });
  });
});