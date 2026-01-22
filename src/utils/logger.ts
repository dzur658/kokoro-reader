import { LogLevel, LogEntry, LoggerConfig } from '../types/logger';

class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private lastMessages = new Map<string, { entry: LogEntry; lastSeen: number }>();
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Creates a new Logger instance with the specified configuration.
   * 
   * IMPORTANT: The constructor automatically starts a cleanup interval that runs
   * every 60 seconds to prevent memory leaks in the deduplication Map. Call the
   * destroy() method when the logger is no longer needed to clear this interval,
   * especially in testing or hot-reload scenarios.
   * 
   * @param config - Partial configuration to override defaults
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableDeduplication: true,
      maxEntries: 1000,
      deduplicationWindow: 5000, // 5 seconds
      ...config
    };
    
    // Set up periodic cleanup of expired deduplication entries
    // Run every minute to prevent unbounded Map growth
    this.cleanupIntervalId = setInterval(() => this.cleanupExpiredMessages(), 60000);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Remove expired entries from deduplication Map to prevent memory leak
   */
  private cleanupExpiredMessages(): void {
    const now = Date.now();
    for (const [key, value] of this.lastMessages.entries()) {
      if (now - value.lastSeen > this.config.deduplicationWindow) {
        this.lastMessages.delete(key);
      }
    }
  }

  private deduplicateMessage(entry: LogEntry): LogEntry | null {
    if (!this.config.enableDeduplication) return entry;

    const key = `${entry.category}:${entry.message}`;
    const now = Date.now();
    const existing = this.lastMessages.get(key);

    if (existing && (now - existing.lastSeen) < this.config.deduplicationWindow) {
      // Update count and timestamp
      existing.entry.count = (existing.entry.count || 1) + 1;
      existing.lastSeen = now;
      return null; // Don't log duplicate
    }

    // New or expired message
    this.lastMessages.set(key, { entry: { ...entry, count: 1 }, lastSeen: now });
    return entry;
  }

  private addEntry(entry: LogEntry): void {
    if (this.entries.length >= this.config.maxEntries) {
      this.entries.shift();
    }
    this.entries.push(entry);
  }

  private formatMessage(entry: LogEntry): string {
    const countSuffix = entry.count && entry.count > 1 ? ` (×${entry.count})` : '';
    return `[${entry.category}] ${entry.message}${countSuffix}`;
  }

  log(level: LogLevel, category: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      category,
      message,
      data,
      timestamp: Date.now()
    };

    const deduplicatedEntry = this.deduplicateMessage(entry);
    if (!deduplicatedEntry) return;

    this.addEntry(deduplicatedEntry);

    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(deduplicatedEntry);
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, data);
          break;
        case LogLevel.INFO:
          console.log(formattedMessage, data);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, data);
          break;
      }
    }
  }

  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clearEntries(): void {
    this.entries = [];
    this.lastMessages.clear();
  }

  /**
   * Cleanup method to be called when logger is no longer needed.
   * Clears the cleanup interval and all stored entries to prevent memory leaks.
   * 
   * IMPORTANT: This method should be called before discarding a Logger instance,
   * especially in testing or hot-reload scenarios where Logger instances may be
   * created and destroyed frequently. The cleanup interval started in the
   * constructor will continue running until this method is called.
   * 
   * @example
   * ```typescript
   * const myLogger = new Logger({ level: LogLevel.DEBUG });
   * myLogger.info('app', 'Application started');
   * // ... use logger throughout application lifecycle
   * myLogger.destroy(); // Clean up before discarding
   * ```
   */
  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.clearEntries();
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = new Logger({
  level: isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
  enableConsole: true,
  enableDeduplication: true,
  maxEntries: 1000,
  deduplicationWindow: 5000
});

// Export for testing and configuration
export { Logger, LogLevel };
