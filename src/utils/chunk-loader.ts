/**
 * Utility for managing loading states
 */

/**
 * Delay utility for managing loading states
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
