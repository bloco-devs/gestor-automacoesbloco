/**
 * Escala oficial de espaçamento — DS 2.0
 * Múltiplos de 4px. Não usar valores fora desta escala.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export type SpacingToken = keyof typeof SPACING;
