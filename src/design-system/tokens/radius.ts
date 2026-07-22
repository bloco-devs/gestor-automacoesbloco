export const RADIUS = {
  sm: "rounded-md",
  base: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  pill: "rounded-full",
} as const;

export type RadiusToken = keyof typeof RADIUS;
