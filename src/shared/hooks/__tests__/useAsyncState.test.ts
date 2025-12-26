import { renderHook, act } from '@testing-library/react';
import { useAsyncState } from '../useAsyncState';

describe('useAsyncState', () => {
  describe('Initial state', () => {
    it('should initialize with null data, false loading, and null error', () => {
      const { result } = renderHook(() => useAsyncState<string>());

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with custom initial data', () => {
      const initialData = { id: 1, name: 'Test' };
      const { result } = renderHook(() => useAsyncState({ initialData }));

      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with loading state if specified', () => {
      const { result } = renderHook(() => useAsyncState({ initialLoading: true }));

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setData', () => {
    it('should update data and clear loading/error states', () => {
      const { result } = renderHook(() => useAsyncState<string>());

      // Test clearing loading state
      act(() => {
        result.current.setLoading(true);
      });
      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setData('New data');
      });
      expect(result.current.data).toBe('New data');
      expect(result.current.loading).toBe(false);

      // Test clearing error state
      act(() => {
        result.current.setError(new Error('Test error'));
      });
      expect(result.current.error).toBeInstanceOf(Error);

      act(() => {
        result.current.setData('Updated data');
      });
      expect(result.current.data).toBe('Updated data');
      expect(result.current.error).toBeNull();
    });

    it('should handle null data', () => {
      const { result } = renderHook(() => useAsyncState<string>({ initialData: 'Initial' }));

      act(() => {
        result.current.setData(null);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should work with complex data types', () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const { result } = renderHook(() => useAsyncState<User>());
      const userData: User = { id: 1, name: 'John', email: 'john@example.com' };

      act(() => {
        result.current.setData(userData);
      });

      expect(result.current.data).toEqual(userData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      const { result } = renderHook(() => useAsyncState<string>());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('should not clear data when setting loading to true', () => {
      const { result } = renderHook(() => useAsyncState<string>({ initialData: 'Test' }));

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.data).toBe('Test');
      expect(result.current.loading).toBe(true);
    });

    it('should not clear error when setting loading to true', () => {
      const { result } = renderHook(() => useAsyncState<string>());
      const testError = new Error('Test error');

      act(() => {
        result.current.setError(testError);
        result.current.setLoading(true);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.loading).toBe(true);
    });
  });

  describe('setError', () => {
    it('should update error and clear loading state', () => {
      const { result } = renderHook(() => useAsyncState<string>());
      const testError = new Error('Test error');

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.loading).toBe(false);
    });

    it('should not clear data when setting error', () => {
      const { result } = renderHook(() => useAsyncState<string>({ initialData: 'Test' }));
      const testError = new Error('Test error');

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.data).toBe('Test');
      expect(result.current.error).toBe(testError);
    });

    it('should handle null error (clearing error)', () => {
      const { result } = renderHook(() => useAsyncState<string>());
      const testError = new Error('Test error');

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toBe(testError);

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useAsyncState<string>());

      act(() => {
        result.current.setData('Test data');
        result.current.setLoading(true);
        result.current.setError(new Error('Test error'));
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should reset to custom initial values if provided', () => {
      const initialData = { id: 1, name: 'Initial' };
      const { result } = renderHook(() =>
        useAsyncState({ initialData, initialLoading: true })
      );

      act(() => {
        result.current.setData({ id: 2, name: 'Updated' });
        result.current.setLoading(false);
        result.current.setError(new Error('Test error'));
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety for data', () => {
      interface Product {
        id: number;
        name: string;
        price: number;
      }

      const { result } = renderHook(() => useAsyncState<Product>());
      const product: Product = { id: 1, name: 'Laptop', price: 999 };

      act(() => {
        result.current.setData(product);
      });

      // TypeScript should enforce that data is Product | null
      expect(result.current.data).toEqual(product);
      if (result.current.data) {
        expect(result.current.data.id).toBe(1);
        expect(result.current.data.name).toBe('Laptop');
        expect(result.current.data.price).toBe(999);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useAsyncState<number>());

      act(() => {
        result.current.setLoading(true);
        result.current.setData(1);
        result.current.setData(2);
        result.current.setData(3);
      });

      expect(result.current.data).toBe(3);
      expect(result.current.loading).toBe(false);
    });

    it('should handle setting same value multiple times', () => {
      const { result } = renderHook(() => useAsyncState<string>());

      act(() => {
        result.current.setData('Same value');
        result.current.setData('Same value');
        result.current.setData('Same value');
      });

      expect(result.current.data).toBe('Same value');
    });

    it('should work with arrays', () => {
      const { result } = renderHook(() => useAsyncState<number[]>());
      const numbers = [1, 2, 3, 4, 5];

      act(() => {
        result.current.setData(numbers);
      });

      expect(result.current.data).toEqual(numbers);
    });

    it('should work with empty arrays', () => {
      const { result } = renderHook(() => useAsyncState<string[]>());

      act(() => {
        result.current.setData([]);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.data).toHaveLength(0);
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should handle typical fetch flow: loading -> success', () => {
      const { result } = renderHook(() => useAsyncState<string>());

      // Start fetch
      act(() => {
        result.current.setLoading(true);
      });
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // Fetch succeeds
      act(() => {
        result.current.setData('Fetched data');
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe('Fetched data');
      expect(result.current.error).toBeNull();
    });

    it('should handle typical fetch flow: loading -> error', () => {
      const { result } = renderHook(() => useAsyncState<string>());
      const fetchError = new Error('Network error');

      // Start fetch
      act(() => {
        result.current.setLoading(true);
      });
      expect(result.current.loading).toBe(true);

      // Fetch fails
      act(() => {
        result.current.setError(fetchError);
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(fetchError);
      expect(result.current.data).toBeNull();
    });

    it('should handle retry after error', () => {
      const { result } = renderHook(() => useAsyncState<string>());
      const firstError = new Error('First error');

      // First attempt fails
      act(() => {
        result.current.setLoading(true);
      });
      act(() => {
        result.current.setError(firstError);
      });
      expect(result.current.error).toBe(firstError);

      // Retry - loading should clear error
      act(() => {
        result.current.setLoading(true);
        result.current.setError(null); // Clear previous error
      });
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();

      // Retry succeeds
      act(() => {
        result.current.setData('Success on retry');
      });
      expect(result.current.data).toBe('Success on retry');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle updating data after initial load', () => {
      const { result } = renderHook(() => useAsyncState<number>());

      // Initial load
      act(() => {
        result.current.setData(100);
      });
      expect(result.current.data).toBe(100);

      // Update data
      act(() => {
        result.current.setData(200);
      });
      expect(result.current.data).toBe(200);
    });
  });
});
