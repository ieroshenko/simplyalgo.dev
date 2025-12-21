import { toast, type ExternalToast } from 'sonner';

/**
 * Message configuration for promise notifications
 */
interface PromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: Error) => string);
}

/**
 * Centralized notification service wrapping sonner toast
 *
 * This service provides:
 * - Consistent API for all notifications
 * - Default durations for different notification types
 * - Easy mocking in tests
 * - Type-safe options
 *
 * @example
 * ```tsx
 * import { notifications } from '@/shared/services/notificationService';
 *
 * // Success notification
 * notifications.success('Data saved successfully');
 *
 * // Error notification with custom duration
 * notifications.error('Failed to save', { duration: 8000 });
 *
 * // Loading notification
 * const loadingId = notifications.loading('Uploading...');
 * // Later: toast.dismiss(loadingId);
 *
 * // Promise-based notification
 * await notifications.promise(
 *   fetchData(),
 *   {
 *     loading: 'Loading...',
 *     success: 'Loaded!',
 *     error: 'Failed to load'
 *   }
 * );
 * ```
 */
class NotificationService {
  /**
   * Default durations for different notification types (in milliseconds)
   */
  private readonly DEFAULT_DURATIONS = {
    success: 4000,
    error: 6000,
    info: 4000,
    warning: 5000,
    loading: Infinity,
  };

  /**
   * Show a success notification
   *
   * @param message - Success message to display
   * @param options - Optional toast configuration
   * @returns Toast ID for dismissing later
   */
  success(message: string, options?: ExternalToast): string | number {
    return toast.success(message, {
      duration: this.DEFAULT_DURATIONS.success,
      ...options,
    });
  }

  /**
   * Show an error notification
   *
   * @param message - Error message or Error object to display
   * @param options - Optional toast configuration
   * @returns Toast ID for dismissing later
   */
  error(message: string | Error | unknown, options?: ExternalToast): string | number {
    const errorMessage = message instanceof Error ? message.message : String(message);
    return toast.error(errorMessage, {
      duration: this.DEFAULT_DURATIONS.error,
      ...options,
    });
  }

  /**
   * Show an info notification
   *
   * @param message - Info message to display
   * @param options - Optional toast configuration
   * @returns Toast ID for dismissing later
   */
  info(message: string, options?: ExternalToast): string | number {
    return toast.info(message, {
      duration: this.DEFAULT_DURATIONS.info,
      ...options,
    });
  }

  /**
   * Show a warning notification
   *
   * @param message - Warning message to display
   * @param options - Optional toast configuration
   * @returns Toast ID for dismissing later
   */
  warning(message: string, options?: ExternalToast): string | number {
    return toast.warning(message, {
      duration: this.DEFAULT_DURATIONS.warning,
      ...options,
    });
  }

  /**
   * Show a loading notification
   *
   * Use the returned ID to dismiss the loading notification later with toast.dismiss(id)
   *
   * @param message - Loading message to display
   * @param options - Optional toast configuration
   * @returns Toast ID for dismissing later
   *
   * @example
   * ```tsx
   * const loadingId = notifications.loading('Uploading file...');
   * try {
   *   await uploadFile();
   *   toast.dismiss(loadingId);
   *   notifications.success('File uploaded!');
   * } catch (error) {
   *   toast.dismiss(loadingId);
   *   notifications.error('Upload failed');
   * }
   * ```
   */
  loading(message: string, options?: ExternalToast): string | number {
    return toast.loading(message, {
      duration: this.DEFAULT_DURATIONS.loading,
      ...options,
    });
  }

  /**
   * Show a promise-based notification
   *
   * Automatically shows loading, success, or error based on promise state
   *
   * @param promise - Promise to track
   * @param messages - Messages for loading, success, and error states
   * @param options - Optional toast configuration
   * @returns The promise result
   *
   * @example
   * ```tsx
   * const data = await notifications.promise(
   *   fetchUsers(),
   *   {
   *     loading: 'Loading users...',
   *     success: 'Users loaded successfully',
   *     error: 'Failed to load users'
   *   }
   * );
   *
   * // With dynamic messages
   * await notifications.promise(
   *   createUser(userData),
   *   {
   *     loading: 'Creating user...',
   *     success: (user) => `Created user ${user.name}`,
   *     error: (err) => `Failed: ${err.message}`
   *   }
   * );
   * ```
   */
  promise<T>(
    promise: Promise<T>,
    messages: PromiseMessages<T>,
    options?: ExternalToast
  ): Promise<T> {
    return toast.promise(promise, messages, options);
  }
}

/**
 * Singleton instance of NotificationService
 *
 * Use this throughout the application for all notifications
 */
export const notifications = new NotificationService();

/**
 * Type exports for convenience
 */
export type { ExternalToast, PromiseMessages };
