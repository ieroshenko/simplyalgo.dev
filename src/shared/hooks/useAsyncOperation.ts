import { useCallback } from 'react';
import { useAsyncState } from './useAsyncState';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Options for execute function
 */
interface ExecuteOptions<T> {
  /** Message to show on successful operation */
  successMessage?: string;
  /** Message to show on failed operation (defaults to error message) */
  errorMessage?: string;
  /** Callback to run after successful operation */
  onSuccess?: (data: T) => void;
  /** Callback to run after failed operation */
  onError?: (error: Error) => void;
}

/**
 * Return type for useAsyncOperation hook
 */
interface UseAsyncOperationReturn<T> {
  /** Current data value */
  data: T | null;
  /** Loading state indicator */
  loading: boolean;
  /** Error object if an error occurred */
  error: Error | null;
  /** Execute an async operation with automatic error handling and notifications */
  execute: <Args extends unknown[]>(
    operation: (...args: Args) => Promise<T>,
    ...args: Args | [...Args, ExecuteOptions<T>]
  ) => Promise<void>;
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
 * Check if an argument is an options object
 */
const isOptions = <T>(arg: unknown): arg is ExecuteOptions<T> => {
  if (!arg || typeof arg !== 'object') return false;
  const keys = Object.keys(arg);
  const validKeys = ['successMessage', 'errorMessage', 'onSuccess', 'onError'];
  return keys.length > 0 && keys.every((key) => validKeys.includes(key));
};

/**
 * Custom hook for executing async operations with automatic error handling
 *
 * This hook extends useAsyncState to provide:
 * - Automatic try-catch error handling
 * - Success/error toast notifications
 * - onSuccess/onError callbacks
 * - Consistent loading state management
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useAsyncOperation<User[]>();
 *
 * const fetchUsers = async () => {
 *   await execute(
 *     userService.getAll,
 *     {
 *       successMessage: 'Users loaded successfully',
 *       errorMessage: 'Failed to load users'
 *     }
 *   );
 * };
 *
 * // With arguments
 * const createUser = async (name: string, email: string) => {
 *   await execute(
 *     userService.create,
 *     name,
 *     email,
 *     {
 *       successMessage: 'User created!',
 *       onSuccess: (user) => navigate(`/users/${user.id}`)
 *     }
 *   );
 * };
 * ```
 *
 * @template T - Type of data returned by the operation
 * @param options - Optional initial values for data and loading state
 * @returns Object containing state, execute function, and state setters
 */
export const useAsyncOperation = <T = unknown>(
  options?: { initialData?: T | null; initialLoading?: boolean }
): UseAsyncOperationReturn<T> => {
  const { data, loading, error, setData, setLoading, setError, reset } =
    useAsyncState<T>(options);

  /**
   * Execute an async operation with automatic error handling
   */
  const execute = useCallback(
    async <Args extends unknown[]>(
      operation: (...args: Args) => Promise<T>,
      ...args: Args | [...Args, ExecuteOptions<T>]
    ): Promise<void> => {
      // Parse options from arguments
      let executeOptions: ExecuteOptions<T> = {};
      let operationArgs: Args = args as Args;

      // Check if last argument is options
      if (args.length > 0) {
        const lastArg = args[args.length - 1];
        if (isOptions<T>(lastArg)) {
          executeOptions = lastArg;
          operationArgs = args.slice(0, -1) as Args;
        }
      }

      // Check if first (and only) argument is options
      if (args.length === 1 && isOptions<T>(args[0])) {
        executeOptions = args[0];
        operationArgs = [] as unknown as Args;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await operation(...operationArgs);

        // Convert undefined to null for consistency with useAsyncState
        const finalResult = result === undefined ? null : result;
        setData(finalResult as T | null);

        // Call onSuccess callback if provided
        if (executeOptions.onSuccess) {
          try {
            executeOptions.onSuccess(finalResult as T);
          } catch (callbackError) {
            logger.error('[useAsyncOperation] Error in onSuccess callback', {
              error: callbackError,
            });
          }
        }

        // Show success toast if message provided
        if (executeOptions.successMessage) {
          toast.success(executeOptions.successMessage);
        }
      } catch (err) {
        // Convert error to Error object
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Call onError callback if provided
        if (executeOptions.onError) {
          try {
            executeOptions.onError(error);
          } catch (callbackError) {
            logger.error('[useAsyncOperation] Error in onError callback', {
              error: callbackError,
            });
          }
        }

        // Show error toast
        const errorMessage = executeOptions.errorMessage || error.message;
        toast.error(errorMessage);

        logger.error('[useAsyncOperation] Operation failed', {
          error: error.message,
          stack: error.stack,
        });
      }
    },
    [setData, setLoading, setError]
  );

  return {
    data,
    loading,
    error,
    execute,
    setData,
    setLoading,
    setError,
    reset,
  };
};
