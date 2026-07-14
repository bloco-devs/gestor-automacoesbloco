// Conversor Trello -> CanonicalSnapshot (RFC-001).
// PURO. Sem I/O. Sem acesso a rede. Sem escrita.

import type {
  CanonicalAttachment,
  CanonicalBoard,
  CanonicalCard,
  CanonicalChecklist,
  CanonicalChecklistItem,
  CanonicalComment,
  CanonicalLabel,
  CanonicalList,
  CanonicalMember,
  CanonicalSnapshot,
  CanonicalWorkspace,
} from '../core/interfaces.ts';
import { SNAPSHOT_VERSION } from '../core/versions.ts';
import { toOrdemFromPos, trelloColorToHex, trelloDateToIso, trelloCheckItemDone } from './mapper.ts';
import type { TrelloBoardExport, TrelloCard, TrelloChecklist } from './parseJson.ts';
import { TRELLO_SOURCE } from './version.ts';

export function trelloToSnapshot(input: TrelloBoardExport): CanonicalSnapshot {
  const boardId = input.id;

  const workspaces: CanonicalWorkspace[] = [];
  const boards: CanonicalBoard[] = [{
    external_id: boardId,
    nome: input.name,
    descricao: input.desc || undefined,
    cor: input.prefs?.backgroundColor || undefined,
    background: input.prefs?.backgroundImage || input.prefs?.background || undefined,
  }];

  const listsRaw = (input.lists ?? []);
  const listOrdem = toOrdemFromPos(listsRaw);
  const lists: CanonicalList[] = listsRaw.map((l) => ({
    external_id: l.id,
    board_external_id: boardId,
    nome: l.name,
    ordem: listOrdem.get(l) ?? 0,
    arquivada: !!l.closed,
  }));

  const labels: CanonicalLabel[] = (input.labels ?? []).map((lb) => ({
    external_id: lb.id,
    board_external_id: boardId,
    nome: lb.name || '(sem nome)',
    cor: trelloColorToHex(lb.color),
  }));

  // Cards ordenados por lista (ordem local relativa à coluna).
  const cardsByList = new Map<string, TrelloCard[]>();
  for (const c of (input.cards ?? [])) {
    const arr = cardsByList.get(c.idList) ?? [];
    arr.push(c);
    cardsByList.set(c.idList, arr);
  }
  const cards: CanonicalCard[] = [];
  for (const [, arr] of cardsByList) {
    const ord = toOrdemFromPos(arr);
    for (const c of arr) {
      const coverUrl = c.cover?.scaled?.length
        ? c.cover.scaled[c.cover.scaled.length - 1].url
        : undefined;
      cards.push({
        external_id: c.id,
        list_external_id: c.idList,
        board_external_id: boardId,
        titulo: c.name,
        descricao_md: c.desc || undefined,
        data_entrega: trelloDateToIso(c.due),
        ordem: ord.get(c) ?? 0,
        arquivado: !!c.closed,
        concluido: !!c.dueComplete,
        label_external_ids: c.idLabels ?? [],
        membro_external_ids: c.idMembers ?? [],
        cover_url: coverUrl,
      });
    }
  }

  // Checklists — associados via idCard.
  const checklists: CanonicalChecklist[] = [];
  const clRaw = (input.checklists ?? []) as TrelloChecklist[];
  const clOrdemByCard = new Map<string, Map<TrelloChecklist, number>>();
  const byCard = new Map<string, TrelloChecklist[]>();
  for (const cl of clRaw) {
    const arr = byCard.get(cl.idCard) ?? [];
    arr.push(cl);
    byCard.set(cl.idCard, arr);
  }
  for (const [cardId, arr] of byCard) {
    clOrdemByCard.set(cardId, toOrdemFromPos(arr));
  }
  for (const cl of clRaw) {
    const items = (cl.checkItems ?? []);
    const itemOrdem = toOrdemFromPos(items);
    const canonicalItems: CanonicalChecklistItem[] = items.map((it) => ({
      external_id: it.id,
      checklist_external_id: cl.id,
      texto: it.name,
      ordem: itemOrdem.get(it) ?? 0,
      concluido: trelloCheckItemDone(it.state),
    }));
    checklists.push({
      external_id: cl.id,
      card_external_id: cl.idCard,
      nome: cl.name,
      ordem: clOrdemByCard.get(cl.idCard)?.get(cl) ?? 0,
      items: canonicalItems,
    });
  }

  // Comentários — vêm em actions type='commentCard'.
  const comments: CanonicalComment[] = [];
  for (const a of (input.actions ?? [])) {
    if (a.type !== 'commentCard') continue;
    const cardExt = a.data?.card?.id;
    const texto = a.data?.text ?? '';
    if (!cardExt || !texto) continue;
    comments.push({
      external_id: a.id,
      card_external_id: cardExt,
      autor_external_id: a.idMemberCreator ?? a.memberCreator?.id,
      texto_md: texto,
      criado_em: trelloDateToIso(a.date) ?? new Date(0).toISOString(),
    });
  }

  // Anexos — vêm dentro de cada card (URL remota; download é responsabilidade
  // futura de outra fase, nunca aqui).
  const attachments: CanonicalAttachment[] = [];
  for (const c of (input.cards ?? [])) {
    for (const a of (c.attachments ?? [])) {
      attachments.push({
        external_id: a.id,
        card_external_id: c.id,
        filename: a.fileName || a.name || 'anexo',
        mime_type: a.mimeType || undefined,
        size_bytes: typeof a.bytes === 'number' ? a.bytes : undefined,
        url: a.url,
      });
    }
  }

  const members: CanonicalMember[] = (input.members ?? []).map((m) => ({
    external_id: m.id,
    username: m.username,
    full_name: m.fullName,
    avatar_url: m.avatarUrl ?? undefined,
  }));

  return {
    snapshot_version: SNAPSHOT_VERSION,
    source: TRELLO_SOURCE,
    workspaces,
    boards,
    lists,
    labels,
    cards,
    checklists,
    comments,
    attachments,
    members,
  };
}
