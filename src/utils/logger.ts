type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  sessionId?: string;
  problemId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

// New Relic type declarations
declare global {
  interface Window {
    newrelic?: {
      log: (message: string, attributes?: Record<string, any>) => void;
      noticeError: (error: Error, attributes?: Record<string, any>) => void;
      addPageAction: (name: string, attributes?: Record<string, any>) => void;
      setCustomAttribute: (name: string, value: any) => void;
      setUserId: (userId: string) => void;
      interaction: (name?: string) => void;
      finished: (startTime?: number) => void;
      start: () => void;
    };
  }
}

class Logger {
  // Determine environment: 
  // - Vercel sets PROD=true in production builds
  // - import.meta.env.DEV is true only in local dev server
  // - Also check hostname as fallback (localhost = dev)
  private isDevelopment = this.detectEnvironment();

  private detectEnvironment(): boolean {
    // Check Vite's built-in environment flags first
    if (import.meta.env.DEV) return true;
    if (import.meta.env.PROD) return false;

    // Check for Vercel environment (always production when deployed)
    if (import.meta.env.VITE_VERCEL_ENV === 'production') return false;
    if (import.meta.env.VITE_VERCEL_ENV === 'preview') return false;

    // Fallback: check hostname
    if (typeof window !== 'undefined') {
      const hostname = window.location?.hostname || '';
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
      if (hostname.includes('vercel.app') || hostname.includes('simplyalgo')) return false;
    }

    // Default to production for safety (don't spam console in prod)
    return false;
  }

  // Expose environment status for debugging
  get isProduction(): boolean {
    return !this.isDevelopment;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext, ...args: unknown[]) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context), ...args);
    } else {
      // In production, send to New Relic if available
      if (window.newrelic) {
        try {
          window.newrelic.log(message, { ...context, level: 'debug' });
        } catch (nrError) {
          console.error('Failed to send log to New Relic:', nrError);
        }
      }
    }
  }

  info(message: string, context?: LogContext, ...args: unknown[]) {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context), ...args);
    } else {
      // In production, send to New Relic if available
      if (window.newrelic) {
        try {
          window.newrelic.log(message, { ...context, level: 'info' });
        } catch (nrError) {
          console.error('Failed to send log to New Relic:', nrError);
        }
      }
    }
  }

  warn(message: string, context?: LogContext, ...args: unknown[]) {
    console.warn(this.formatMessage('warn', message, context), ...args);

    // In production, also send to New Relic
    if (!this.isDevelopment && window.newrelic) {
      try {
        window.newrelic.log(message, { ...context, level: 'warn' });
      } catch (nrError) {
        console.error('Failed to send warning to New Relic:', nrError);
      }
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext, ...args: unknown[]) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error(this.formatMessage('error', message, context), errorObj, ...args);

    // In production, send to New Relic if available
    if (!this.isDevelopment) {
      if (window.newrelic) {
        try {
          window.newrelic.noticeError(errorObj, { ...context, message });
        } catch (nrError) {
          console.error('Failed to send error to New Relic:', nrError);
        }
      }
    }
  }

  // Specialized logging methods for common use cases
  apiCall(method: string, url: string, context?: LogContext) {
    this.debug(`API ${method} ${url}`, { ...context, type: 'api_call' });
  }

  apiResponse(method: string, url: string, status: number, duration: number, context?: LogContext) {
    this.debug(`API ${method} ${url} - ${status} (${duration}ms)`, {
      ...context,
      type: 'api_response',
      status,
      duration
    });
  }

  userAction(action: string, context?: LogContext) {
    this.info(`User action: ${action}`, { ...context, type: 'user_action' });
  }

  codeAnalysis(message: string, context?: LogContext) {
    this.debug(`Code Analysis: ${message}`, { ...context, type: 'code_analysis' });
  }

  aiChat(message: string, context?: LogContext) {
    this.debug(`AI Chat: ${message}`, { ...context, type: 'ai_chat' });
  }
}

export const logger = new Logger();