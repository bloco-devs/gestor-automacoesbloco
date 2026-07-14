// Logger estruturado, sem dependências. Escreve JSON no stdout do Deno.
// Nunca loga PII (email/tokens/URLs assinadas). Adapters podem usar diretamente.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  job_id?: string;
  source?: string;
  phase?: string;
  entity_type?: string;
  external_id?: string;
  [k: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function envLevel(): LogLevel {
  try {
    const raw = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } })
      .Deno?.env?.get?.('IMPORTER_LOG_LEVEL')?.toLowerCase();
    if (raw && raw in LEVEL_ORDER) return raw as LogLevel;
  } catch { /* ignore */ }
  return 'info';
}

const MIN = LEVEL_ORDER[envLevel()];

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  if (LEVEL_ORDER[level] < MIN) return;
  const line = { ts: new Date().toISOString(), level, message, ...(ctx ?? {}) };
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  out(JSON.stringify(line));
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit('debug', msg, ctx),
  info:  (msg: string, ctx?: LogContext) => emit('info',  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => emit('warn',  msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),
  child: (base: LogContext) => ({
    debug: (msg: string, ctx?: LogContext) => emit('debug', msg, { ...base, ...ctx }),
    info:  (msg: string, ctx?: LogContext) => emit('info',  msg, { ...base, ...ctx }),
    warn:  (msg: string, ctx?: LogContext) => emit('warn',  msg, { ...base, ...ctx }),
    error: (msg: string, ctx?: LogContext) => emit('error', msg, { ...base, ...ctx }),
  }),
};
