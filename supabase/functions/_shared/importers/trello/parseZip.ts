// Parser de ZIP de export Trello. Sem I/O de rede.
// Estratégia: localizar o primeiro *.json plausível dentro do ZIP e delegar
// para parseTrelloJson. Suporta ZIPs contendo múltiplos boards escolhendo
// o arquivo cujo nome combina com o board_id informado (opcional).
//
// Depende de jszip (npm) — resolvido pelo runtime Deno das edge functions.
// Nesta fase o parser é usado apenas por futuros wrappers; nenhum código
// atual chama parseTrelloZip em produção.

import JSZip from 'npm:jszip@3.10.1';
import { AdapterParseError } from '../core/errors.ts';
import { parseTrelloJson, type TrelloBoardExport } from './parseJson.ts';

export interface ZipParseOptions {
  /** Se informado, prefere o arquivo cujo caminho contenha este id. */
  preferBoardId?: string;
}

export async function parseTrelloZip(
  bytes: ArrayBuffer | Uint8Array,
  opts: ZipParseOptions = {},
): Promise<TrelloBoardExport> {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch (e) {
    throw new AdapterParseError(`ZIP inválido: ${(e as Error).message}`);
  }

  const jsonEntries = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.toLowerCase().endsWith('.json'),
  );
  if (jsonEntries.length === 0) {
    throw new AdapterParseError('ZIP não contém arquivos .json.');
  }

  // Preferência: nome contém o board id.
  let chosen = jsonEntries[0];
  if (opts.preferBoardId) {
    const hit = jsonEntries.find((f) => f.name.includes(opts.preferBoardId!));
    if (hit) chosen = hit;
  }

  const text = await chosen.async('string');
  return parseTrelloJson(text);
}
