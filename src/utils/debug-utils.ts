/**
 * Debug utilities for TTS pipeline investigation
 */
import { logger } from './logger';

export interface TTSDebugInfo {
  stage: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export class TTSDebugger {
  private static readonly MAX_LOGS = 1000;
  private logs: TTSDebugInfo[] = [];
  
  log(stage: string, success: boolean, data?: any, error?: string): void {
    const info: TTSDebugInfo = {
      stage,
      success,
      data,
      error,
      timestamp: Date.now()
    };
    
    // Implement circular buffer to prevent memory leaks
    if (this.logs.length >= TTSDebugger.MAX_LOGS) {
      this.logs.shift();
    }
    
    this.logs.push(info);
    
    // Use new logger system instead of direct console output
    const message = success ? 'SUCCESS' : 'FAILED';
    
    if (success) {
      logger.debug('tts', `${stage}: ${message}`, data);
    } else {
      logger.error('tts', `${stage}: ${message}`, { error, data });
    }
  }
  
  getLogs(): TTSDebugInfo[] {
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  getFailures(): TTSDebugInfo[] {
    return this.logs.filter(log => !log.success);
  }
}

export const ttsDebugger = new TTSDebugger();
