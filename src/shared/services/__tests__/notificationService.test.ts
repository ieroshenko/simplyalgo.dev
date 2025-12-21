import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { notifications } from '../notificationService';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success', () => {
    it('should show success toast with message', () => {
      notifications.success('Operation successful');

      expect(toast.success).toHaveBeenCalledWith('Operation successful', expect.any(Object));
    });

    it('should pass custom options to toast', () => {
      notifications.success('Success!', { duration: 5000 });

      expect(toast.success).toHaveBeenCalledWith('Success!', {
        duration: 5000,
      });
    });

    it('should return toast id', () => {
      vi.mocked(toast.success).mockReturnValue(123);

      const id = notifications.success('Success');

      expect(id).toBe(123);
    });
  });

  describe('error', () => {
    it('should show error toast with message', () => {
      notifications.error('Operation failed');

      expect(toast.error).toHaveBeenCalledWith('Operation failed', expect.any(Object));
    });

    it('should pass custom options to toast', () => {
      notifications.error('Error!', { duration: 10000 });

      expect(toast.error).toHaveBeenCalledWith('Error!', {
        duration: 10000,
      });
    });

    it('should handle Error objects', () => {
      const error = new Error('Something went wrong');
      notifications.error(error);

      expect(toast.error).toHaveBeenCalledWith('Something went wrong', expect.any(Object));
    });

    it('should handle unknown errors', () => {
      notifications.error({ message: 'Custom error' });

      expect(toast.error).toHaveBeenCalledWith('[object Object]', expect.any(Object));
    });
  });

  describe('info', () => {
    it('should show info toast with message', () => {
      notifications.info('Information message');

      expect(toast.info).toHaveBeenCalledWith('Information message', expect.any(Object));
    });

    it('should pass custom options to toast', () => {
      notifications.info('Info!', { duration: 3000 });

      expect(toast.info).toHaveBeenCalledWith('Info!', {
        duration: 3000,
      });
    });
  });

  describe('warning', () => {
    it('should show warning toast with message', () => {
      notifications.warning('Warning message');

      expect(toast.warning).toHaveBeenCalledWith('Warning message', expect.any(Object));
    });

    it('should pass custom options to toast', () => {
      notifications.warning('Warning!', { duration: 7000 });

      expect(toast.warning).toHaveBeenCalledWith('Warning!', {
        duration: 7000,
      });
    });
  });

  describe('loading', () => {
    it('should show loading toast with message', () => {
      notifications.loading('Loading...');

      expect(toast.loading).toHaveBeenCalledWith('Loading...', expect.any(Object));
    });

    it('should pass custom options to toast', () => {
      notifications.loading('Processing...', { duration: Infinity });

      expect(toast.loading).toHaveBeenCalledWith('Processing...', {
        duration: Infinity,
      });
    });

    it('should return toast id for dismissing later', () => {
      vi.mocked(toast.loading).mockReturnValue(456);

      const id = notifications.loading('Loading');

      expect(id).toBe(456);
    });
  });

  describe('promise', () => {
    it('should handle promise with success', async () => {
      const mockPromise = Promise.resolve('Success data');
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Failed!',
      };

      vi.mocked(toast.promise).mockReturnValue(mockPromise);
      await notifications.promise(mockPromise, messages);

      expect(toast.promise).toHaveBeenCalledWith(mockPromise, messages, undefined);
    });

    it('should handle promise with error', async () => {
      const mockPromise = Promise.reject(new Error('Failed'));
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Failed!',
      };

      // Mock toast.promise to return the promise so we can handle rejection
      vi.mocked(toast.promise).mockReturnValue(mockPromise);

      try {
        await notifications.promise(mockPromise, messages);
        // Should not reach here
        expect.fail('Promise should have rejected');
      } catch (error) {
        // Expected to fail
        expect(error).toBeInstanceOf(Error);
      }

      expect(toast.promise).toHaveBeenCalledWith(mockPromise, messages, undefined);
    });

    it('should pass custom options to toast.promise', async () => {
      const mockPromise = Promise.resolve('Data');
      const messages = {
        loading: 'Loading...',
        success: 'Done!',
        error: 'Error!',
      };
      const options = { duration: 5000 };

      vi.mocked(toast.promise).mockReturnValue(mockPromise);
      await notifications.promise(mockPromise, messages, options);

      expect(toast.promise).toHaveBeenCalledWith(mockPromise, messages, options);
    });

    it('should support function-based messages', async () => {
      const mockPromise = Promise.resolve({ name: 'Test' });
      const messages = {
        loading: 'Loading...',
        success: (data: { name: string }) => `Loaded ${data.name}`,
        error: (err: Error) => `Failed: ${err.message}`,
      };

      vi.mocked(toast.promise).mockReturnValue(mockPromise);
      await notifications.promise(mockPromise, messages);

      expect(toast.promise).toHaveBeenCalledWith(mockPromise, messages, undefined);
    });
  });

  describe('Default options', () => {
    it('should use default duration for success', () => {
      notifications.success('Test');

      expect(toast.success).toHaveBeenCalledWith('Test', {
        duration: 4000,
      });
    });

    it('should use default duration for error', () => {
      notifications.error('Test');

      expect(toast.error).toHaveBeenCalledWith('Test', {
        duration: 6000,
      });
    });

    it('should use default duration for info', () => {
      notifications.info('Test');

      expect(toast.info).toHaveBeenCalledWith('Test', {
        duration: 4000,
      });
    });

    it('should use default duration for warning', () => {
      notifications.warning('Test');

      expect(toast.warning).toHaveBeenCalledWith('Test', {
        duration: 5000,
      });
    });

    it('should use default duration for loading', () => {
      notifications.loading('Test');

      expect(toast.loading).toHaveBeenCalledWith('Test', {
        duration: Infinity,
      });
    });

    it('should allow overriding default duration', () => {
      notifications.success('Test', { duration: 1000 });

      expect(toast.success).toHaveBeenCalledWith('Test', {
        duration: 1000,
      });
    });
  });

  describe('Real-world usage', () => {
    it('should handle typical success notification', () => {
      notifications.success('Data saved successfully');

      expect(toast.success).toHaveBeenCalledWith('Data saved successfully', {
        duration: 4000,
      });
    });

    it('should handle typical error with custom duration', () => {
      notifications.error('Failed to connect to server', { duration: 8000 });

      expect(toast.error).toHaveBeenCalledWith('Failed to connect to server', {
        duration: 8000,
      });
    });

    it('should handle loading state that can be dismissed', () => {
      const loadingId = notifications.loading('Uploading file...');

      expect(loadingId).toBeDefined();
      expect(toast.loading).toHaveBeenCalledWith('Uploading file...', {
        duration: Infinity,
      });
    });

    it('should handle async operation with promise', async () => {
      const fetchData = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { id: 1, name: 'Test' };
      };

      const promise = fetchData();
      vi.mocked(toast.promise).mockReturnValue(promise);

      await notifications.promise(promise, {
        loading: 'Fetching data...',
        success: 'Data fetched successfully',
        error: 'Failed to fetch data',
      });

      expect(toast.promise).toHaveBeenCalled();
    });

    it('should handle API error with Error object', () => {
      const apiError = new Error('API rate limit exceeded');
      notifications.error(apiError);

      expect(toast.error).toHaveBeenCalledWith('API rate limit exceeded', {
        duration: 6000,
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty message', () => {
      notifications.success('');

      expect(toast.success).toHaveBeenCalledWith('', { duration: 4000 });
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(1000);
      notifications.info(longMessage);

      expect(toast.info).toHaveBeenCalledWith(longMessage, { duration: 4000 });
    });

    it('should handle special characters in message', () => {
      notifications.warning('Error: <script>alert("XSS")</script>');

      expect(toast.warning).toHaveBeenCalledWith(
        'Error: <script>alert("XSS")</script>',
        { duration: 5000 }
      );
    });

    it('should handle multiple options', () => {
      notifications.success('Test', {
        duration: 3000,
        position: 'top-right',
        dismissible: true,
      });

      expect(toast.success).toHaveBeenCalledWith('Test', {
        duration: 3000,
        position: 'top-right',
        dismissible: true,
      });
    });
  });
});
