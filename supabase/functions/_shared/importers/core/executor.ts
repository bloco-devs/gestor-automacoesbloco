// Executor: única porta autorizada para o banco.
// REGRAS:
//  - Proibido SQL direto.
//  - Proibido acesso direto a tabelas do Kanban.
//  - Proibido bypass de RLS.
//  - Toda criação deve usar as RPCs existentes do módulo Atividades.
//
// Esta é a base abstrata do Executor. Implementações concretas (real / dry-run)
// serão fornecidas na fase de wiring com a Edge Function, sempre respeitando o
// contrato definido em interfaces.ts.

import type {
  CanonicalAttachment,
  CanonicalBoard,
  CanonicalCard,
  CanonicalChecklist,
  CanonicalChecklistItem,
  CanonicalComment,
  CanonicalLabel,
  CanonicalList,
  Executor,
  ImportTarget,
  ProgressUpdate,
} from './interfaces.ts';

export interface SupabaseLike {
  // Assinatura mínima que o Executor concreto usará para invocar RPCs.
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
}

/**
 * Base abstrata: fornece o esqueleto de idempotência e cancelamento.
 * Implementações concretas devem sobrescrever os métodos de escrita para chamar
 * RPCs existentes do Kanban (ex.: atividades_create_board, atividades_coluna_create,
 * atividades_label_upsert, criação de cards/checklists/comentários/anexos).
 */
export abstract class BaseExecutor implements Executor {
  readonly dry_run: boolean;
  protected job_id: string;
  protected client: SupabaseLike;

  constructor(params: { job_id: string; client: SupabaseLike; dry_run: boolean }) {
    this.job_id = params.job_id;
    this.client = params.client;
    this.dry_run = params.dry_run;
  }

  async lookupEntity(entity_type: string, external_id: string): Promise<string | null> {
    const { data, error } = await this.client.rpc('atividades_import_entity_get', {
      _job_id: this.job_id,
      _entity_type: entity_type,
      _external_id: external_id,
    });
    if (error) throw new Error(`lookupEntity(${entity_type}): ${error.message}`);
    return (data as string | null) ?? null;
  }

  async registerEntity(entity_type: string, external_id: string, local_id: string): Promise<void> {
    const { error } = await this.client.rpc('atividades_import_entity_register', {
      _job_id: this.job_id,
      _entity_type: entity_type,
      _external_id: external_id,
      _local_id: local_id,
    });
    if (error) throw new Error(`registerEntity(${entity_type}): ${error.message}`);
  }

  async reportProgress(update: ProgressUpdate): Promise<void> {
    const { error } = await this.client.rpc('atividades_import_job_update_progress', {
      _job_id: this.job_id,
      _progress: update as unknown as Record<string, unknown>,
      _status: null,
    });
    if (error) throw new Error(`reportProgress: ${error.message}`);
  }

  async isCancelled(): Promise<boolean> {
    // Implementação concreta consulta atividades_import_jobs.status === 'cancelled'.
    // Base não conhece o schema; retorna false por default.
    return false;
  }

  // ------- Métodos de escrita: implementados pela camada concreta -------
  abstract createBoard(board: CanonicalBoard, target: ImportTarget): Promise<string>;
  abstract createColuna(local_board_id: string, list: CanonicalList): Promise<string>;
  abstract reuseColuna(local_board_id: string, list: CanonicalList): Promise<string | null>;
  abstract createLabel(local_board_id: string, label: CanonicalLabel): Promise<string>;
  abstract reuseLabel(local_board_id: string, label: CanonicalLabel): Promise<string | null>;
  abstract createCard(local_board_id: string, local_coluna_id: string, card: CanonicalCard): Promise<string>;
  abstract linkCardLabel(local_card_id: string, local_label_id: string): Promise<void>;
  abstract createChecklist(local_card_id: string, checklist: CanonicalChecklist): Promise<string>;
  abstract createChecklistItem(local_checklist_id: string, item: CanonicalChecklistItem): Promise<string>;
  abstract createComentario(local_card_id: string, comment: CanonicalComment): Promise<string>;
  abstract createAnexo(local_card_id: string, local_board_id: string, att: CanonicalAttachment): Promise<string>;
}

/** Executor no-op para dry-run puro: nunca escreve; gera IDs sintéticos estáveis. */
export class DryRunExecutor extends BaseExecutor {
  constructor(params: { job_id: string; client: SupabaseLike }) {
    super({ ...params, dry_run: true });
  }
  private synthetic(prefix: string, external_id: string): string {
    return `dry:${prefix}:${external_id}`;
  }
  async createBoard(board: CanonicalBoard) { return this.synthetic('board', board.external_id); }
  async createColuna(_b: string, list: CanonicalList) { return this.synthetic('coluna', list.external_id); }
  async reuseColuna(): Promise<string | null> { return null; }
  async createLabel(_b: string, label: CanonicalLabel) { return this.synthetic('label', label.external_id); }
  async reuseLabel(): Promise<string | null> { return null; }
  async createCard(_b: string, _c: string, card: CanonicalCard) { return this.synthetic('card', card.external_id); }
  async linkCardLabel(): Promise<void> { /* no-op */ }
  async createChecklist(_c: string, cl: CanonicalChecklist) { return this.synthetic('checklist', cl.external_id); }
  async createChecklistItem(_cl: string, it: CanonicalChecklistItem) { return this.synthetic('checklist_item', it.external_id); }
  async createComentario(_c: string, cm: CanonicalComment) { return this.synthetic('comentario', cm.external_id); }
  async createAnexo(_c: string, _b: string, a: CanonicalAttachment) { return this.synthetic('anexo', a.external_id); }
}
