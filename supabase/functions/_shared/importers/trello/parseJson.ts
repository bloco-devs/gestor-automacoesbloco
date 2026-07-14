// Tipos crus do export JSON do Trello (parcial — só o que consumimos).
// Documentação: https://developer.atlassian.com/cloud/trello/rest/
// Nada além de tipagem estrutural + validação leve. Sem I/O.

import { AdapterParseError } from '../core/errors.ts';

export interface TrelloMember {
  id: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  avatarHash?: string | null;
}

export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string | null;
}

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
  closed: boolean;
  idBoard?: string;
}

export interface TrelloAttachment {
  id: string;
  name?: string;
  url?: string;
  mimeType?: string | null;
  bytes?: number | null;
  fileName?: string | null;
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  pos: number;
  state: 'complete' | 'incomplete' | string;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idCard: string;
  pos: number;
  checkItems?: TrelloCheckItem[];
}

export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  idList: string;
  pos: number;
  due?: string | null;
  dueComplete?: boolean;
  closed?: boolean;
  idLabels?: string[];
  idMembers?: string[];
  idChecklists?: string[];
  attachments?: TrelloAttachment[];
  cover?: { scaled?: Array<{ url: string; width?: number }>; sharedSourceUrl?: string | null } | null;
  idAttachmentCover?: string | null;
}

export interface TrelloAction {
  id: string;
  type: string;
  date: string;
  idMemberCreator?: string;
  memberCreator?: { id: string };
  data?: {
    text?: string;
    card?: { id: string };
  };
}

export interface TrelloBoardExport {
  id: string;
  name: string;
  desc?: string;
  closed?: boolean;
  prefs?: {
    backgroundColor?: string | null;
    backgroundImage?: string | null;
    background?: string | null;
  };
  lists?: TrelloList[];
  cards?: TrelloCard[];
  labels?: TrelloLabel[];
  checklists?: TrelloChecklist[];
  members?: TrelloMember[];
  actions?: TrelloAction[];
}

/** Parseia JSON bruto de export Trello. Valida shape mínimo. */
export function parseTrelloJson(raw: string | ArrayBuffer | Uint8Array | object): TrelloBoardExport {
  let obj: unknown;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); }
    catch (e) { throw new AdapterParseError(`JSON inválido: ${(e as Error).message}`); }
  } else if (raw instanceof ArrayBuffer || raw instanceof Uint8Array) {
    const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw;
    try { obj = JSON.parse(new TextDecoder('utf-8').decode(bytes)); }
    catch (e) { throw new AdapterParseError(`JSON inválido: ${(e as Error).message}`); }
  } else if (raw && typeof raw === 'object') {
    obj = raw;
  } else {
    throw new AdapterParseError('Entrada vazia ou tipo não suportado.');
  }

  if (!obj || typeof obj !== 'object') {
    throw new AdapterParseError('JSON não é um objeto.');
  }
  const b = obj as Partial<TrelloBoardExport>;
  if (typeof b.id !== 'string' || !b.id) {
    throw new AdapterParseError('Campo obrigatório ausente: id (board).');
  }
  if (typeof b.name !== 'string' || !b.name) {
    throw new AdapterParseError('Campo obrigatório ausente: name (board).');
  }
  // Arrays opcionais são normalizados para [] no snapshot.
  return b as TrelloBoardExport;
}
