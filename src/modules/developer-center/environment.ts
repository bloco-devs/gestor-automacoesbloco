/**
 * Ambiente de build / runtime — informações somente-leitura de import.meta e navigator.
 */
export interface EnvironmentInfo {
  mode: string;
  dev: boolean;
  prod: boolean;
  base: string;
  userAgent: string;
  language: string;
  platform: string;
  online: boolean;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  screen: { w: number; h: number; dpr: number };
  timestamp: number;
}

export function getEnvironmentInfo(): EnvironmentInfo {
  const env = (import.meta as { env?: Record<string, unknown> }).env ?? {};
  const nav = typeof navigator !== "undefined" ? navigator : ({} as Navigator);
  const scr = typeof screen !== "undefined" ? screen : ({ width: 0, height: 0 } as Screen);
  return {
    mode: String(env.MODE ?? "unknown"),
    dev: Boolean(env.DEV),
    prod: Boolean(env.PROD),
    base: String(env.BASE_URL ?? "/"),
    userAgent: nav.userAgent ?? "",
    language: nav.language ?? "",
    platform: (nav as Navigator & { platform?: string }).platform ?? "",
    online: nav.onLine ?? true,
    hardwareConcurrency: nav.hardwareConcurrency ?? 0,
    deviceMemory: (nav as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    screen: {
      w: scr.width ?? 0,
      h: scr.height ?? 0,
      dpr: typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1,
    },
    timestamp: Date.now(),
  };
}
