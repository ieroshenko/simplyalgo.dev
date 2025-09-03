type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  sessionId?: string;
  problemId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
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
    }
  }
  
  info(message: string, context?: LogContext, ...args: unknown[]) {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context), ...args);
    }
  }
  
  warn(message: string, context?: LogContext, ...args: unknown[]) {
    console.warn(this.formatMessage('warn', message, context), ...args);
  }
  
  error(message: string, error?: Error | unknown, context?: LogContext, ...args: unknown[]) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    console.error(this.formatMessage('error', message, context), errorObj, ...args);
    
    // In production, send to error tracking service
    if (!this.isDevelopment) {
      // TODO: Implement error tracking service integration
      // sendToErrorTracking(errorObj, message, context);
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