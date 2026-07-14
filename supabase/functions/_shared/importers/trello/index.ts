// Adapter Trello — cola pública do adapter.
// Contrato: ImportAdapter<TrelloBoardExport>.
// Responsabilidade única: converter TrelloBoardExport -> CanonicalSnapshot.
// Não conversa com o Executor nem com o Runner. Não faz I/O.

import type { CanonicalSnapshot, ImportAdapter } from '../core/interfaces.ts';
import { parseTrelloJson, type TrelloBoardExport } from './parseJson.ts';
import { parseTrelloZip, type ZipParseOptions } from './parseZip.ts';
import { trelloToSnapshot } from './snapshot.ts';
import { TRELLO_ADAPTER_VERSION, TRELLO_SOURCE } from './version.ts';

export const trelloAdapter: ImportAdapter<TrelloBoardExport> = {
  source: TRELLO_SOURCE,
  version: TRELLO_ADAPTER_VERSION,
  toSnapshot(raw: TrelloBoardExport): Promise<CanonicalSnapshot> {
    return Promise.resolve(trelloToSnapshot(raw));
  },
};

/** Helpers de conveniência para futuros wrappers (Edge Function ainda não existe). */
export async function trelloSnapshotFromJson(
  raw: string | ArrayBuffer | Uint8Array | object,
): Promise<CanonicalSnapshot> {
  const parsed = parseTrelloJson(raw);
  return trelloAdapter.toSnapshot(parsed);
}

export async function trelloSnapshotFromZip(
  bytes: ArrayBuffer | Uint8Array,
  opts?: ZipParseOptions,
): Promise<CanonicalSnapshot> {
  const parsed = await parseTrelloZip(bytes, opts);
  return trelloAdapter.toSnapshot(parsed);
}

export { TRELLO_ADAPTER_VERSION, TRELLO_SOURCE };
export type { TrelloBoardExport };
