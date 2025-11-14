interface LogLevel {
  ERROR: number;
  WARN: number;
  INFO: number;
  DEBUG: number;
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  private currentLevel: number;

  constructor(level: keyof LogLevel = 'INFO') {
    this.currentLevel = LOG_LEVELS[level];
  }

  private shouldLog(level: keyof LogLevel): boolean {
    return LOG_LEVELS[level] <= this.currentLevel;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('DEBUG')) {
      console.log(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

export const logger = new Logger(process.env.LOG_LEVEL as keyof LogLevel || 'INFO');