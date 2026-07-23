export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  module: string;
  level?: LogLevel;
}

const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function envLevel(): LogLevel {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any)?.env ?? {};
    if (env.DEV) return "debug";
    return "warn";
  } catch {
    return "warn";
  }
}

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  child(subModule: string): Logger;
}

export function createLogger(options: LoggerOptions): Logger {
  const min = levelOrder[options.level ?? envLevel()];
  const prefix = `[${options.module}]`;
  const emit = (lvl: LogLevel, args: unknown[]) => {
    if (levelOrder[lvl] < min) return;
    const fn = lvl === "error" ? console.error : lvl === "warn" ? console.warn : lvl === "info" ? console.info : console.debug;
    fn(prefix, ...args);
  };
  return {
    debug: (...a) => emit("debug", a),
    info: (...a) => emit("info", a),
    warn: (...a) => emit("warn", a),
    error: (...a) => emit("error", a),
    child: (sub) => createLogger({ module: `${options.module}:${sub}`, level: options.level }),
  };
}
