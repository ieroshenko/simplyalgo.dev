import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncOperation } from '../useAsyncOperation';
import { toast } from 'sonner';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('useAsyncOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should initialize with null data, false loading, and null error', () => {
      const { result } = renderHook(() => useAsyncOperation<string>());

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with custom initial data', () => {
      const initialData = { id: 1, name: 'Test' };
      const { result } = renderHook(() => useAsyncOperation({ initialData }));

      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('execute function', () => {
    it('should execute async operation successfully', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Success data');

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.data).toBe('Success data');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading to true during execution', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      let resolveOperation: (value: string) => void;
      const mockOperation = vi.fn().mockReturnValue(
        new Promise<string>((resolve) => {
          resolveOperation = resolve;
        })
      );

      // Start execution (don't await)
      let executePromise: Promise<void>;
      act(() => {
        executePromise = result.current.execute(mockOperation);
      });

      // Wait for loading to become true
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve the operation
      act(() => {
        resolveOperation!('Data');
      });

      // Wait for execution to complete
      await act(async () => {
        await executePromise!;
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe('Data');
    });

    it('should handle operation errors', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const testError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(testError);

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(testError);
    });

    it('should handle string errors', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockRejectedValue('String error');

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('String error');
    });

    it('should pass arguments to the operation', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Result');

      await act(async () => {
        await result.current.execute(mockOperation, 'arg1', 123, { key: 'value' });
      });

      expect(mockOperation).toHaveBeenCalledWith('arg1', 123, { key: 'value' });
    });
  });

  describe('Success notifications', () => {
    it('should show success toast when successMessage is provided', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Data');

      await act(async () => {
        await result.current.execute(mockOperation, { successMessage: 'Operation successful!' });
      });

      expect(toast.success).toHaveBeenCalledWith('Operation successful!');
    });

    it('should not show success toast when successMessage is not provided', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Data');

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should call onSuccess callback when provided', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Success data');
      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.execute(mockOperation, { onSuccess });
      });

      expect(onSuccess).toHaveBeenCalledWith('Success data');
    });

    it('should call onSuccess before showing success toast', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Data');
      const callOrder: string[] = [];
      const onSuccess = vi.fn(() => callOrder.push('onSuccess'));

      vi.mocked(toast.success).mockImplementation(() => {
        callOrder.push('toast');
        return 1;
      });

      await act(async () => {
        await result.current.execute(mockOperation, {
          onSuccess,
          successMessage: 'Success!',
        });
      });

      expect(callOrder).toEqual(['onSuccess', 'toast']);
    });
  });

  describe('Error notifications', () => {
    it('should show error toast when errorMessage is provided', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockRejectedValue(new Error('Failed'));

      await act(async () => {
        await result.current.execute(mockOperation, { errorMessage: 'Operation failed!' });
      });

      expect(toast.error).toHaveBeenCalledWith('Operation failed!');
    });

    it('should show error toast with error message when errorMessage is not provided', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const testError = new Error('Specific error message');
      const mockOperation = vi.fn().mockRejectedValue(testError);

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(toast.error).toHaveBeenCalledWith('Specific error message');
    });

    it('should call onError callback when provided', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const testError = new Error('Test error');
      const mockOperation = vi.fn().mockRejectedValue(testError);
      const onError = vi.fn();

      await act(async () => {
        await result.current.execute(mockOperation, { onError });
      });

      expect(onError).toHaveBeenCalledWith(testError);
    });

    it('should call onError before showing error toast', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockRejectedValue(new Error('Failed'));
      const callOrder: string[] = [];
      const onError = vi.fn(() => callOrder.push('onError'));

      vi.mocked(toast.error).mockImplementation(() => {
        callOrder.push('toast');
        return 1;
      });

      await act(async () => {
        await result.current.execute(mockOperation, {
          onError,
          errorMessage: 'Error!',
        });
      });

      expect(callOrder).toEqual(['onError', 'toast']);
    });
  });

  describe('Options handling', () => {
    it('should handle options as first argument', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Data');

      await act(async () => {
        await result.current.execute(mockOperation, {
          successMessage: 'Success!',
          errorMessage: 'Error!',
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Success!');
    });

    it('should handle options as last argument after other args', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Data');

      await act(async () => {
        await result.current.execute(mockOperation, 'arg1', 123, {
          successMessage: 'Success!',
        });
      });

      expect(mockOperation).toHaveBeenCalledWith('arg1', 123);
      expect(toast.success).toHaveBeenCalledWith('Success!');
    });

    it('should work without any options', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Data');

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.data).toBe('Data');
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('State management integration', () => {
    it('should provide setData, setLoading, setError, and reset from useAsyncState', () => {
      const { result } = renderHook(() => useAsyncOperation<string>());

      expect(typeof result.current.setData).toBe('function');
      expect(typeof result.current.setLoading).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should allow manual state updates via setData', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());

      act(() => {
        result.current.setData('Manual data');
      });

      expect(result.current.data).toBe('Manual data');
    });

    it('should allow manual error setting via setError', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const error = new Error('Manual error');

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toBe(error);
    });

    it('should reset state via reset function', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());

      await act(async () => {
        await result.current.execute(
          vi.fn().mockResolvedValue('Data'),
          { successMessage: 'Success!' }
        );
      });

      expect(result.current.data).toBe('Data');

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle fetching user data', async () => {
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const { result } = renderHook(() => useAsyncOperation<User>());
      const mockFetch = vi.fn().mockResolvedValue({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      });

      await act(async () => {
        await result.current.execute(mockFetch, {
          successMessage: 'User loaded successfully',
        });
      });

      expect(result.current.data).toEqual({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(toast.success).toHaveBeenCalledWith('User loaded successfully');
    });

    it('should handle form submission with validation', async () => {
      const { result } = renderHook(() => useAsyncOperation<{ id: string }>());
      const mockSubmit = vi.fn().mockResolvedValue({ id: 'new-123' });
      const onSuccess = vi.fn();

      await act(async () => {
        await result.current.execute(mockSubmit, { email: 'test@example.com' }, {
          successMessage: 'Form submitted!',
          onSuccess,
        });
      });

      expect(mockSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(onSuccess).toHaveBeenCalledWith({ id: 'new-123' });
      expect(toast.success).toHaveBeenCalledWith('Form submitted!');
    });

    it('should handle retry logic after failure', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('Success on retry');

      // First attempt
      await act(async () => {
        await result.current.execute(mockOperation);
      });
      expect(result.current.error?.message).toBe('First attempt failed');

      // Retry
      await act(async () => {
        await result.current.execute(mockOperation, {
          successMessage: 'Retry successful!',
        });
      });
      expect(result.current.data).toBe('Success on retry');
      expect(result.current.error).toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Retry successful!');
    });

    it('should handle paginated data fetching', async () => {
      const { result } = renderHook(() => useAsyncOperation<number[]>());

      // Fetch page 1
      await act(async () => {
        await result.current.execute(
          vi.fn().mockResolvedValue([1, 2, 3]),
          1
        );
      });
      expect(result.current.data).toEqual([1, 2, 3]);

      // Fetch page 2
      await act(async () => {
        await result.current.execute(
          vi.fn().mockResolvedValue([4, 5, 6]),
          2
        );
      });
      expect(result.current.data).toEqual([4, 5, 6]);
    });
  });

  describe('Edge cases', () => {
    it('should handle operation returning null', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue(null);

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle operation returning undefined', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue(undefined);

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle rapid consecutive executions', async () => {
      const { result } = renderHook(() => useAsyncOperation<number>());

      await act(async () => {
        await result.current.execute(vi.fn().mockResolvedValue(1));
        await result.current.execute(vi.fn().mockResolvedValue(2));
        await result.current.execute(vi.fn().mockResolvedValue(3));
      });

      expect(result.current.data).toBe(3);
    });

    it('should handle errors in onSuccess callback', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockResolvedValue('Data');
      const onSuccess = vi.fn().mockImplementation(() => {
        throw new Error('onSuccess error');
      });

      // Should not crash
      await act(async () => {
        await result.current.execute(mockOperation, { onSuccess });
      });

      // Data should still be set despite callback error
      expect(result.current.data).toBe('Data');
    });

    it('should handle errors in onError callback', async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation error'));
      const onError = vi.fn().mockImplementation(() => {
        throw new Error('onError error');
      });

      // Should not crash
      await act(async () => {
        await result.current.execute(mockOperation, { onError });
      });

      // Error should still be set despite callback error
      expect(result.current.error?.message).toBe('Operation error');
    });
  });
});
