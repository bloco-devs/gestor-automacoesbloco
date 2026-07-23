/**
 * Erros de aplicação estruturados. Sempre lançar subclasses de AppError
 * na Domain Layer — nunca `throw new Error("...")` cru.
 */
export class AppError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;

  constructor(code: string, message: string, options?: { cause?: unknown; context?: Record<string, unknown> }) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = options?.cause;
    this.context = options?.context;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} não encontrado: ${id}`, { context: { entity, id } });
  }
}

export class ForbiddenError extends AppError {
  constructor(action: string) {
    super("FORBIDDEN", `Ação não permitida: ${action}`, { context: { action } });
  }
}

export class ValidationError extends AppError {
  readonly issues: Array<{ path: string; message: string }>;
  constructor(issues: Array<{ path: string; message: string }>) {
    super("VALIDATION", "Dados inválidos", { context: { issues } });
    this.issues = issues;
  }
}

export class RepositoryError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("REPOSITORY", message, { cause });
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
