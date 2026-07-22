/**
 * Tipografia oficial — DS 2.0
 * Classes CSS estão em src/index.css (@layer utilities).
 * Use estes helpers para referência em código TS.
 */
export const TYPOGRAPHY_CLASSES = {
  display: "ds-display",
  h1: "ds-h1",
  h2: "ds-h2",
  h3: "ds-h3",
  cardTitle: "ds-card-title",
  body: "ds-body",
  bodyStrong: "ds-body-strong",
  caption: "ds-caption",
  label: "ds-label",
  helper: "ds-helper",
} as const;

export type TypographyToken = keyof typeof TYPOGRAPHY_CLASSES;
