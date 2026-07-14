// Runner genérico e idempotente por fases.
// - Mesmo algoritmo para dry-run e execução real (diferença apenas no Executor).
// - Cancelamento cooperativo entre fases.
// - Idempotência: sempre consulta o Executor antes de criar.

import type {
  CanonicalSnapshot,
  CountsByEntity,
  ErrorItem,
  IgnoredItem,
  Runner,
  RunnerInput,
  RunReport,
  WarningItem,
} from './interfaces.ts';
import { cardKey, colunaKey, labelKey, percent } from './normalize.ts';

const PHASES = ['board', 'colunas', 'labels', 'cards', 'checklists', 'comentarios', 'anexos'] as const;
type Phase = typeof PHASES[number];

function inc(c: CountsByEntity, key: keyof CountsByEntity) {
  c[key] = (c[key] ?? 0) + 1;
}

class Cancelled extends Error {
  constructor() { super('cancelled'); }
}

export class CoreRunner implements Runner {
  async execute(input: RunnerInput): Promise<RunReport> {
    const started = Date.now();
    const { snapshot, options, target, executor, adapter_version, runner_version, file_hash } = input;

    const created: CountsByEntity = {};
    const reused: CountsByEntity = {};
    const ignored: IgnoredItem[] = [];
    const warnings: WarningItem[] = [];
    const errors: ErrorItem[] = [];

    const boardId = snapshot.boards[0]?.external_id;
    if (!boardId) {
      errors.push({ code: 'no_board', message: 'Snapshot sem boards.' });
      return this.finalize({ started, created, reused, ignored, warnings, errors, adapter_version, runner_version, file_hash });
    }

    const board = snapshot.boards.find((b) => b.external_id === boardId)!;
    const lists = snapshot.lists.filter((l) => l.board_external_id === boardId);
    const labels = snapshot.labels.filter((l) => l.board_external_id === boardId);
    const cards = snapshot.cards.filter((c) => c.board_external_id === boardId);
    const checklists = snapshot.checklists.filter((cl) =>
      cards.some((c) => c.external_id === cl.card_external_id));
    const comments = snapshot.comments.filter((cm) =>
      cards.some((c) => c.external_id === cm.card_external_id));
    const attachments = snapshot.attachments.filter((a) =>
      cards.some((c) => c.external_id === a.card_external_id));

    const localColunas = new Map<string, string>();
    const localLabels = new Map<string, string>();
    const localCards = new Map<string, string>();
    const localChecklists = new Map<string, string>();
    let localBoardId: string | undefined;

    const guardCancel = async () => {
      if (await executor.isCancelled()) throw new Cancelled();
    };

    const emit = async (phase: Phase, current: number, total: number, message: string) => {
      await executor.reportProgress({ phase, current, total, percent: percent(current, total), message });
    };

    try {
      // ---------------- Fase board ----------------
      await guardCancel();
      await emit('board', 0, 1, 'Preparando quadro destino');
      if (target.mode === 'existing_board' && target.board_id_local) {
        localBoardId = target.board_id_local;
      } else {
        const existing = await executor.lookupEntity('board', board.external_id);
        if (existing) {
          localBoardId = existing;
          inc(reused, 'boards');
        } else {
          localBoardId = await executor.createBoard(board, target);
          await executor.registerEntity('board', board.external_id, localBoardId);
          inc(created, 'boards');
        }
      }
      await emit('board', 1, 1, 'Quadro pronto');

      // ---------------- Fase colunas ----------------
      if (options.selection.colunas) {
        const total = lists.length;
        for (let i = 0; i < lists.length; i++) {
          await guardCancel();
          const list = lists[i];
          if (list.arquivada && !options.selection.arquivados) {
            ignored.push({ entity_type: 'list', external_id: list.external_id, motivo: 'arquivada_desativada' });
          } else {
            const already = await executor.lookupEntity('list', list.external_id);
            if (already) {
              localColunas.set(list.external_id, already);
              inc(reused, 'colunas');
            } else {
              const reusedId = await executor.reuseColuna(localBoardId!, list);
              if (reusedId) {
                localColunas.set(list.external_id, reusedId);
                await executor.registerEntity('list', list.external_id, reusedId);
                inc(reused, 'colunas');
              } else {
                const id = await executor.createColuna(localBoardId!, list);
                localColunas.set(list.external_id, id);
                await executor.registerEntity('list', list.external_id, id);
                inc(created, 'colunas');
              }
            }
          }
          await emit('colunas', i + 1, total, `Colunas: ${i + 1}/${total}`);
        }
        // usar chave normalizada para futura extensão de match
        void colunaKey;
      }

      // ---------------- Fase labels ----------------
      if (options.selection.etiquetas) {
        const total = labels.length;
        for (let i = 0; i < labels.length; i++) {
          await guardCancel();
          const label = labels[i];
          const already = await executor.lookupEntity('label', label.external_id);
          if (already) {
            localLabels.set(label.external_id, already);
            inc(reused, 'labels');
          } else {
            const reusedId = await executor.reuseLabel(localBoardId!, label);
            if (reusedId) {
              localLabels.set(label.external_id, reusedId);
              await executor.registerEntity('label', label.external_id, reusedId);
              inc(reused, 'labels');
            } else {
              const id = await executor.createLabel(localBoardId!, label);
              localLabels.set(label.external_id, id);
              await executor.registerEntity('label', label.external_id, id);
              inc(created, 'labels');
            }
          }
          await emit('labels', i + 1, total, `Etiquetas: ${i + 1}/${total}`);
        }
        void labelKey;
      }

      // ---------------- Fase cards ----------------
      if (options.selection.cards) {
        const total = cards.length;
        for (let i = 0; i < cards.length; i++) {
          await guardCancel();
          const card = cards[i];
          if (card.arquivado && !options.selection.arquivados) {
            ignored.push({ entity_type: 'card', external_id: card.external_id, motivo: 'arquivado_desativado' });
          } else if (!options.selection.colunas && !localColunas.has(card.list_external_id)) {
            ignored.push({ entity_type: 'card', external_id: card.external_id, motivo: 'coluna_nao_importada' });
          } else if (options.card_conflict === 'skip_same_title_same_column' && this.cardExistsByTitle(card, cards, localCards)) {
            ignored.push({ entity_type: 'card', external_id: card.external_id, motivo: 'titulo_duplicado' });
          } else {
            const colunaLocal = localColunas.get(card.list_external_id);
            if (!colunaLocal) {
              warnings.push({ code: 'missing_column', message: 'Card sem coluna local mapeada.', entity_type: 'card', external_id: card.external_id });
            } else {
              const already = await executor.lookupEntity('card', card.external_id);
              let cardId: string;
              if (already) {
                cardId = already;
                inc(reused, 'cards');
              } else {
                cardId = await executor.createCard(localBoardId!, colunaLocal, card);
                await executor.registerEntity('card', card.external_id, cardId);
                inc(created, 'cards');
              }
              localCards.set(card.external_id, cardId);

              if (options.selection.etiquetas && card.label_external_ids?.length) {
                for (const lex of card.label_external_ids) {
                  const lid = localLabels.get(lex);
                  if (lid) {
                    try { await executor.linkCardLabel(cardId, lid); } catch (e) {
                      warnings.push({ code: 'link_label_failed', message: (e as Error).message, entity_type: 'card', external_id: card.external_id });
                    }
                  }
                }
              }
            }
          }
          await emit('cards', i + 1, total, `Cards: ${i + 1}/${total}`);
        }
        void cardKey;
      }

      // ---------------- Fase checklists ----------------
      if (options.selection.checklists) {
        const total = checklists.length;
        for (let i = 0; i < checklists.length; i++) {
          await guardCancel();
          const cl = checklists[i];
          const cardLocal = localCards.get(cl.card_external_id);
          if (!cardLocal) {
            ignored.push({ entity_type: 'checklist', external_id: cl.external_id, motivo: 'card_nao_importado' });
          } else {
            let clId = await executor.lookupEntity('checklist', cl.external_id);
            if (clId) {
              inc(reused, 'checklists');
            } else {
              clId = await executor.createChecklist(cardLocal, cl);
              await executor.registerEntity('checklist', cl.external_id, clId);
              inc(created, 'checklists');
            }
            localChecklists.set(cl.external_id, clId);
            for (const item of cl.items) {
              const already = await executor.lookupEntity('checklist_item', item.external_id);
              if (already) {
                inc(reused, 'checklist_items');
              } else {
                await executor.createChecklistItem(clId, item);
                await executor.registerEntity('checklist_item', item.external_id, item.external_id);
                inc(created, 'checklist_items');
              }
            }
          }
          await emit('checklists', i + 1, total, `Checklists: ${i + 1}/${total}`);
        }
      }

      // ---------------- Fase comentários ----------------
      if (options.selection.comentarios) {
        const total = comments.length;
        for (let i = 0; i < comments.length; i++) {
          await guardCancel();
          const cm = comments[i];
          const cardLocal = localCards.get(cm.card_external_id);
          if (!cardLocal) {
            ignored.push({ entity_type: 'comment', external_id: cm.external_id, motivo: 'card_nao_importado' });
          } else {
            const already = await executor.lookupEntity('comment', cm.external_id);
            if (already) {
              inc(reused, 'comentarios');
            } else {
              const id = await executor.createComentario(cardLocal, cm);
              await executor.registerEntity('comment', cm.external_id, id);
              inc(created, 'comentarios');
            }
          }
          await emit('comentarios', i + 1, total, `Comentários: ${i + 1}/${total}`);
        }
      }

      // ---------------- Fase anexos ----------------
      if (options.selection.anexos) {
        const total = attachments.length;
        for (let i = 0; i < attachments.length; i++) {
          await guardCancel();
          const a = attachments[i];
          const cardLocal = localCards.get(a.card_external_id);
          if (!cardLocal) {
            ignored.push({ entity_type: 'attachment', external_id: a.external_id, motivo: 'card_nao_importado' });
          } else {
            const already = await executor.lookupEntity('attachment', a.external_id);
            if (already) {
              inc(reused, 'anexos');
            } else {
              try {
                const id = await executor.createAnexo(cardLocal, localBoardId!, a);
                await executor.registerEntity('attachment', a.external_id, id);
                inc(created, 'anexos');
              } catch (e) {
                warnings.push({ code: 'anexo_falhou', message: (e as Error).message, entity_type: 'attachment', external_id: a.external_id });
              }
            }
          }
          await emit('anexos', i + 1, total, `Anexos: ${i + 1}/${total}`);
        }
      }
    } catch (e) {
      if (e instanceof Cancelled) {
        warnings.push({ code: 'cancelled', message: 'Execução cancelada pelo usuário.' });
      } else {
        errors.push({ code: 'runner_error', message: (e as Error).message });
      }
    }

    return this.finalize({ started, created, reused, ignored, warnings, errors, adapter_version, runner_version, file_hash });
  }

  private cardExistsByTitle(
    card: { external_id: string; list_external_id: string; titulo: string },
    all: { external_id: string; list_external_id: string; titulo: string }[],
    localCards: Map<string, string>,
  ): boolean {
    const key = cardKey(card.titulo);
    for (const other of all) {
      if (other.external_id === card.external_id) continue;
      if (other.list_external_id !== card.list_external_id) continue;
      if (cardKey(other.titulo) !== key) continue;
      if (localCards.has(other.external_id)) return true;
    }
    return false;
  }

  private finalize(params: {
    started: number;
    created: CountsByEntity;
    reused: CountsByEntity;
    ignored: IgnoredItem[];
    warnings: WarningItem[];
    errors: ErrorItem[];
    adapter_version: string;
    runner_version: string;
    file_hash: string;
  }): RunReport {
    return {
      duration_ms: Date.now() - params.started,
      created: params.created,
      reused: params.reused,
      ignored: params.ignored,
      warnings: params.warnings,
      errors: params.errors,
      adapter_version: params.adapter_version,
      snapshot_version: '1.0',
      runner_version: params.runner_version,
      file_hash: params.file_hash,
    };
  }
}

export { PHASES };
export type { Phase };
