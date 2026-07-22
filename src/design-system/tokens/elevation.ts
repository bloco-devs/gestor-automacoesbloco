/**
 * Elevação — DS 2.0
 * Tokens CSS (var(--elev-N)) definidos em index.css.
 * Utilities Tailwind expostos como shadow-elev-1..3 via tailwind.config.
 */
export const ELEVATION = {
  1: "shadow-elev-1",
  2: "shadow-elev-2",
  3: "shadow-elev-3",
} as const;

export type ElevationToken = keyof typeof ELEVATION;
