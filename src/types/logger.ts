export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  timestamp: number;
  count?: number; // For deduplication
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableDeduplication: boolean;
  maxEntries: number;
  deduplicationWindow: number; // ms
}
