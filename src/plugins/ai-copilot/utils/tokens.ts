/**
 * Estimativa grosseira de tokens (~4 chars por token).
 * Uso: Developer Tools do Sandbox.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
