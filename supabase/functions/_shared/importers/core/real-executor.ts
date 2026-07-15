// RFC-001 — Fase 6: RealExecutor
// Executor que escreve DE VERDADE no banco, usando exclusivamente:
//  - RPCs existentes do módulo Atividades (board / coluna / label);
//  - Inserts diretos nas tabelas do Kanban (cards, card_labels, comentarios,
//    anexos) — os mesmos endpoints que o frontend utiliza hoje, portanto
//    sujeitos às MESMAS políticas RLS. Nada de bypass.
//
// Escopo suportado nesta fase:
//  ✓ board, colunas, labels, cards, links card↔label, comentários
//  ✓ checklists (mesclados no jsonb `checklist` do próprio card — o módulo
//    Atividades não possui tabela dedicada de checklist)
//  ✗ anexos (Trello serve bytes via URL autenticada; download server-side
//    exige token do usuário e está fora do escopo desta entrega — reportamos
//    warning "anexo_falhou" via runner).
//
// Idempotência: o mapa entity↔local vive em atividades_import_entities,
// consultado por lookupEntity/registerEntity (herdados de BaseExecutor).

import type {
  CanonicalAttachment,
  CanonicalBoard,
  CanonicalCard,
  CanonicalChecklist,
  CanonicalChecklistItem,
  CanonicalComment,
  CanonicalLabel,
  CanonicalList,
  ImportTarget,
} from './interfaces.ts';
import { BaseExecutor, type SupabaseLike } from './executor.ts';

// Cliente com acesso a rpc + from() (subset do @supabase/supabase-js).
export interface SupabaseFullLike extends SupabaseLike {
  from(table: string): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insert(values: Record<string, unknown> | Record<string, unknown>[]): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(values: Record<string, unknown>): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select(cols?: string): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete(): any;
  };
}

interface ChecklistBuf {
  cardId: string;
  nome: string;
  ordem: number;
}

export class RealExecutor extends BaseExecutor {
  private db: SupabaseFullLike;
  private userId: string;
  private cancelFn: () => Promise<boolean>;
  // Buffer para agrupar itens de checklist antes de gravar no jsonb do card.
  private checklistBuf = new Map<string, ChecklistBuf>();

  constructor(params: {
    job_id: string;
    client: SupabaseFullLike;
    user_id: string;
    isCancelled?: () => Promise<boolean>;
  }) {
    super({ job_id: params.job_id, client: params.client, dry_run: false });
    this.db = params.client;
    this.userId = params.user_id;
    this.cancelFn = params.isCancelled ?? (async () => false);
  }

  override async isCancelled(): Promise<boolean> {
    try { return await this.cancelFn(); } catch { return false; }
  }

  // ------------------------------------------------------------------
  // Board / colunas / labels — via RPCs (respeitam permissões do módulo)
  // ------------------------------------------------------------------
  async createBoard(board: CanonicalBoard, target: ImportTarget): Promise<string> {
    // Se o alvo é um board existente o Runner já retorna direto; este
    // método só é chamado para create_board.
    const nome = target.novo_board_nome?.trim() || board.nome || 'Quadro importado';
    const { data, error } = await this.db.rpc('atividades_create_board', {
      _nome: nome,
      _descricao: board.descricao ?? null,
      _visibilidade: 'workspace',
      _cor: board.cor ?? null,
      _icone: null,
      _background: board.background ?? null,
      _workspace_id: null,
    });
    if (error) throw new Error(`createBoard: ${error.message}`);
    return data as string;
  }

  async createColuna(local_board_id: string, list: CanonicalList): Promise<string> {
    const { data, error } = await this.db.rpc('atividades_coluna_create', {
      _board_id: local_board_id,
      _nome: list.nome,
      _chave: null,
    });
    if (error) throw new Error(`createColuna: ${error.message}`);
    return data as string;
  }

  async reuseColuna(): Promise<string | null> {
    // Estratégia conservadora: não reaproveita colunas do board destino
    // automaticamente. O Runner cai no createColuna. Fica reservado para
    // uma futura política de "matching por nome".
    return null;
  }

  async createLabel(local_board_id: string, label: CanonicalLabel): Promise<string> {
    const { data, error } = await this.db.rpc('atividades_label_upsert', {
      _board_id: local_board_id,
      _id: null,
      _nome: label.nome || 'Etiqueta',
      _cor: label.cor || '#6b7280',
    });
    if (error) throw new Error(`createLabel: ${error.message}`);
    return data as string;
  }

  async reuseLabel(): Promise<string | null> { return null; }

  // ------------------------------------------------------------------
  // Card / vínculos — insert direto (mesma superfície que o frontend usa)
  // ------------------------------------------------------------------
  async createCard(local_board_id: string, local_coluna_id: string, card: CanonicalCard): Promise<string> {
    const row: Record<string, unknown> = {
      board_id: local_board_id,
      coluna_id: local_coluna_id,
      titulo: (card.titulo || 'Sem título').slice(0, 500),
      descricao: card.descricao_md ?? '',
      responsavel_id: null,
      responsavel_ids: [],
      responsavel_persona_ids: [],
      solucao_id: null,
      checklist: [],
      links: [],
      created_by: this.userId,
      ordem: card.ordem ?? 0,
      data_entrega: card.data_entrega ?? null,
      prioridade: 'media',
      cover_cor: null,
      concluido: card.concluido ?? false,
    };
    const { data, error } = await this.db
      .from('atividades_cards')
      .insert(row)
      .select('id')
      .single();
    if (error) throw new Error(`createCard: ${error.message}`);
    return (data as { id: string }).id;
  }

  async linkCardLabel(local_card_id: string, local_label_id: string): Promise<void> {
    const { error } = await this.db
      .from('atividades_card_labels')
      .insert({ card_id: local_card_id, label_id: local_label_id });
    if (error) {
      // Ignora violação de unicidade (idempotência)
      if (/duplicate|unique|23505/i.test(error.message)) return;
      throw new Error(`linkCardLabel: ${error.message}`);
    }
  }

  // ------------------------------------------------------------------
  // Checklists — jsonb no próprio card
  // ------------------------------------------------------------------
  async createChecklist(local_card_id: string, checklist: CanonicalChecklist): Promise<string> {
    // Não há tabela dedicada; apenas registramos o vínculo local.
    const synth = `chk:${checklist.external_id}`;
    this.checklistBuf.set(synth, {
      cardId: local_card_id,
      nome: checklist.nome ?? '',
      ordem: checklist.ordem ?? 0,
    });
    return synth;
  }

  async createChecklistItem(local_checklist_id: string, item: CanonicalChecklistItem): Promise<string> {
    const buf = this.checklistBuf.get(local_checklist_id);
    if (!buf) throw new Error('createChecklistItem: checklist ausente no buffer');
    // Lê checklist atual do card, acrescenta e grava.
    const { data: row, error: selErr } = await this.db
      .from('atividades_cards')
      .select('checklist')
      .eq('id', buf.cardId)
      .single();
    if (selErr) throw new Error(`checklistItem.select: ${selErr.message}`);
    const current = Array.isArray((row as { checklist?: unknown }).checklist)
      ? ((row as { checklist: unknown[] }).checklist as Array<Record<string, unknown>>)
      : [];
    const texto = buf.nome
      ? `[${buf.nome}] ${item.texto}`
      : item.texto;
    const itemId = `imp-${item.external_id}`;
    // Idempotência local: se o item já está lá, não duplica.
    if (current.some((c) => (c as { id?: string }).id === itemId)) return itemId;
    current.push({ id: itemId, texto, concluido: !!item.concluido });
    const { error: updErr } = await this.db
      .from('atividades_cards')
      .update({ checklist: current })
      .eq('id', buf.cardId);
    if (updErr) throw new Error(`checklistItem.update: ${updErr.message}`);
    return itemId;
  }

  // ------------------------------------------------------------------
  // Comentários
  // ------------------------------------------------------------------
  async createComentario(local_card_id: string, comment: CanonicalComment): Promise<string> {
    const texto = (comment.texto_md ?? '').slice(0, 10_000);
    const { data, error } = await this.db
      .from('atividades_comentarios')
      .insert({ card_id: local_card_id, user_id: this.userId, texto })
      .select('id')
      .single();
    if (error) throw new Error(`createComentario: ${error.message}`);
    return (data as { id: string }).id;
  }

  // ------------------------------------------------------------------
  // Anexos — não suportado nesta fase (ver cabeçalho)
  // ------------------------------------------------------------------
  createAnexo(_c: string, _b: string, _a: CanonicalAttachment): Promise<string> {
    return Promise.reject(new Error('anexos não suportados na execução server-side (fase atual)'));
  }
}
