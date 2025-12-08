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
  private isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
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