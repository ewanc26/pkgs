/**
 * Browser-safe logger for Jasper web
 * No file logging, no Node.js dependencies
 */
import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export class BrowserLogger {
  private level: LogLevel;
  private prefix: string;

  constructor(level: LogLevel = LogLevel.INFO, prefix: string = "") {
    this.level = level;
    this.prefix = prefix;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(message: string): string {
    return this.prefix ? `${this.prefix} ${message}` : message;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(chalk.gray(`[DEBUG] ${this.formatMessage(message)}`), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(chalk.green(`✓ ${this.formatMessage(message)}`), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(chalk.yellow(`⚠️  ${this.formatMessage(message)}`), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(chalk.red(`✗ ${this.formatMessage(message)}`), ...args);
    }
  }

  fatal(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(chalk.red.bold(`🛑 ${this.formatMessage(message)}`), ...args);
    }
  }

  progress(message: string, ...args: unknown[]): void {
    if (this.level < LogLevel.SILENT) {
      console.log(chalk.cyan(`→ ${this.formatMessage(message)}`), ...args);
    }
  }
}

// Global browser logger instance
let browserLogger: BrowserLogger = new BrowserLogger(LogLevel.INFO);

export function getBrowserLogger(): BrowserLogger {
  return browserLogger;
}

export const browserLog = {
  debug: (msg: string, ...args: unknown[]) => browserLogger.debug(msg, ...args),
  info: (msg: string, ...args: unknown[]) => browserLogger.info(msg, ...args),
  success: (msg: string, ...args: unknown[]) => browserLogger.success(msg, ...args),
  warn: (msg: string, ...args: unknown[]) => browserLogger.warn(msg, ...args),
  error: (msg: string, ...args: unknown[]) => browserLogger.error(msg, ...args),
  fatal: (msg: string, ...args: unknown[]) => browserLogger.fatal(msg, ...args),
  progress: (msg: string, ...args: unknown[]) => browserLogger.progress(msg, ...args),
};
