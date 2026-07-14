// Erros tipados do framework de importação (RFC-001).
// Uso: adapters, runner e executor.

export class ImporterError extends Error {
  readonly code: string;
  readonly entity_type?: string;
  readonly external_id?: string;
  constructor(code: string, message: string, meta?: { entity_type?: string; external_id?: string }) {
    super(message);
    this.name = 'ImporterError';
    this.code = code;
    this.entity_type = meta?.entity_type;
    this.external_id = meta?.external_id;
  }
}

export class AdapterParseError extends ImporterError {
  constructor(message: string, meta?: { entity_type?: string; external_id?: string }) {
    super('adapter_parse_error', message, meta);
    this.name = 'AdapterParseError';
  }
}

export class AdapterValidationError extends ImporterError {
  constructor(message: string, meta?: { entity_type?: string; external_id?: string }) {
    super('adapter_validation_error', message, meta);
    this.name = 'AdapterValidationError';
  }
}

export class UnsupportedSourceError extends ImporterError {
  constructor(source: string) {
    super('unsupported_source', `Fonte não suportada: ${source}`);
    this.name = 'UnsupportedSourceError';
  }
}

export class CancelledError extends ImporterError {
  constructor() {
    super('cancelled', 'Execução cancelada pelo usuário.');
    this.name = 'CancelledError';
  }
}

export class ExecutorError extends ImporterError {
  constructor(message: string, meta?: { entity_type?: string; external_id?: string }) {
    super('executor_error', message, meta);
    this.name = 'ExecutorError';
  }
}
