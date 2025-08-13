interface ErrorLog {
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  stack?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

class ErrorMonitor {
  private logs: ErrorLog[] = [];
  private maxLogs = 1000;

  logError(error: Error, metadata?: Record<string, any>) {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      metadata
    };

    this.addLog(errorLog);
    this.sendToMonitoringService(errorLog);
  }

  logWarning(message: string, metadata?: Record<string, any>) {
    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'warning',
      message,
      metadata
    };

    this.addLog(log);
  }

  logInfo(message: string, metadata?: Record<string, any>) {
    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'info',
      message,
      metadata
    };

    this.addLog(log);
  }

  private addLog(log: ErrorLog) {
    this.logs.push(log);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${log.level.toUpperCase()}]`, log.message, log.metadata);
    }
  }

  private async sendToMonitoringService(log: ErrorLog) {
    if (process.env.NODE_ENV === 'production') {
      // In production, send to monitoring service like Sentry, DataDog, etc.
      // This is a placeholder for actual implementation
      try {
        // Example: await sendToSentry(log);
        // Example: await sendToDataDog(log);
        
        // For now, log to console in production
        console.error('[Production Error]', {
          message: log.message,
          code: log.code,
          timestamp: log.timestamp,
          metadata: log.metadata
        });
      } catch (monitoringError) {
        console.error('Failed to send error to monitoring service:', monitoringError);
      }
    }
  }

  getRecentErrors(count: number = 50): ErrorLog[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-count);
  }

  getErrorStats() {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const lastHour = now - 60 * 60 * 1000;

    const errors24h = this.logs.filter(
      log => log.level === 'error' && log.timestamp.getTime() > last24Hours
    );

    const errorsLastHour = this.logs.filter(
      log => log.level === 'error' && log.timestamp.getTime() > lastHour
    );

    return {
      total: this.logs.filter(log => log.level === 'error').length,
      last24Hours: errors24h.length,
      lastHour: errorsLastHour.length,
      errorRate: errorsLastHour.length / 60 // errors per minute in last hour
    };
  }

  clearLogs() {
    this.logs = [];
  }
}

export const errorMonitor = new ErrorMonitor();

// Middleware to track errors
export function withErrorMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorMonitor.logError(
        error as Error,
        {
          context,
          args: args.length > 0 ? args : undefined
        }
      );
      throw error;
    }
  }) as T;
}