import { useState, useCallback } from 'react';

/**
 * Options for initializing useAsyncState
 */
interface UseAsyncStateOptions<T> {
  /** Initial data value (defaults to null) */
  initialData?: T | null;
  /** Initial loading state (defaults to false) */
  initialLoading?: boolean;
}

/**
 * Return type for useAsyncState hook
 */
interface UseAsyncStateReturn<T> {
  /** Current data value */
  data: T | null;
  /** Loading state indicator */
  loading: boolean;
  /** Error object if an error occurred */
  error: Error | null;
  /** Set data and clear loading/error states */
  setData: (data: T | null) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error and clear loading state */
  setError: (error: Error | null) => void;
  /** Reset all state to initial values */
  reset: () => void;
}

/**
 * Custom hook for managing async state with data, loading, and error
 *
 * This hook provides a consistent pattern for handling async operations:
 * - data: The fetched/computed data (or null)
 * - loading: Boolean indicating if operation is in progress
 * - error: Error object if operation failed (or null)
 *
 * @example
 * ```tsx
 * const { data, loading, error, setData, setLoading, setError, reset } = useAsyncState<User[]>();
 *
 * const fetchUsers = async () => {
 *   setLoading(true);
 *   try {
 *     const users = await userService.getAll();
 *     setData(users);
 *   } catch (err) {
 *     setError(err instanceof Error ? err : new Error(String(err)));
 *   }
 * };
 * ```
 *
 * @template T - Type of data being managed
 * @param options - Optional initial values for data and loading state
 * @returns Object containing state and setter functions
 */
export const useAsyncState = <T = unknown>(
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T> => {
  const { initialData = null, initialLoading = false } = options;

  const [data, setDataState] = useState<T | null>(initialData);
  const [loading, setLoadingState] = useState<boolean>(initialLoading);
  const [error, setErrorState] = useState<Error | null>(null);

  /**
   * Set data and automatically clear loading and error states
   */
  const setData = useCallback((newData: T | null) => {
    setDataState(newData);
    setLoadingState(false);
    setErrorState(null);
  }, []);

  /**
   * Set loading state without affecting data or error
   */
  const setLoading = useCallback((newLoading: boolean) => {
    setLoadingState(newLoading);
  }, []);

  /**
   * Set error and automatically clear loading state (only when setting an error, not when clearing)
   */
  const setError = useCallback((newError: Error | null) => {
    setErrorState(newError);
    // Only clear loading if we're actually setting an error (not clearing it)
    if (newError !== null) {
      setLoadingState(false);
    }
  }, []);

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    setDataState(initialData);
    setLoadingState(initialLoading);
    setErrorState(null);
  }, [initialData, initialLoading]);

  return {
    data,
    loading,
    error,
    setData,
    setLoading,
    setError,
    reset,
  };
};
