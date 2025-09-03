type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  sessionId?: string;
  problemId?: string;
  function?: string;
  action?: string;
  duration?: number;
  [key: string]: unknown;
}

class ServerLogger {
  private isDevelopment = Deno.env.get("ENVIRONMENT") !== "production";
  
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

  // Specialized logging methods for Edge Functions
  functionStart(functionName: string, context?: LogContext) {
    this.info(`Function ${functionName} started`, { ...context, function: functionName, type: 'function_start' });
  }

  functionEnd(functionName: string, duration: number, context?: LogContext) {
    this.info(`Function ${functionName} completed`, { 
      ...context, 
      function: functionName,
      duration,
      type: 'function_end'
    });
  }

  llmCall(model: string, tokens: number, context?: LogContext) {
    this.debug(`LLM call to ${model}`, { 
      ...context, 
      model,
      tokens,
      type: 'llm_call'
    });
  }

  llmResponse(model: string, inputTokens: number, outputTokens: number, duration: number, context?: LogContext) {
    this.debug(`LLM response from ${model}`, { 
      ...context, 
      model,
      inputTokens,
      outputTokens,
      duration,
      type: 'llm_response'
    });
  }

  codeAnalysis(message: string, context?: LogContext) {
    this.debug(`Code Analysis: ${message}`, { ...context, type: 'code_analysis' });
  }

  coaching(message: string, context?: LogContext) {
    this.debug(`Coaching: ${message}`, { ...context, type: 'coaching' });
  }
}

export const logger = new ServerLogger();