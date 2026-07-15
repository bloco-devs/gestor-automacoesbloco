// Parser de ZIP de export Trello. Sem I/O de rede.
// Endurecimentos (pré-Fase 5):
//   - Valida assinatura ZIP (PK\x03\x04) antes de invocar JSZip.
//   - Limita número de arquivos internos (MAX_FILES).
//   - Limita tamanho total descompactado (MAX_UNCOMPRESSED_BYTES).
//   - Limita razão de compressão por arquivo (MAX_RATIO) — protege contra ZIP bombs.
//
// Estratégia: localizar o primeiro *.json plausível dentro do ZIP e delegar
// para parseTrelloJson. Suporta ZIPs contendo múltiplos boards escolhendo
// o arquivo cujo nome combina com o board_id informado (opcional).

import JSZip from 'npm:jszip@3.10.1';
import { AdapterParseError } from '../core/errors.ts';
import { parseTrelloJson, type TrelloBoardExport } from './parseJson.ts';

export interface ZipParseOptions {
  /** Se informado, prefere o arquivo cujo caminho contenha este id. */
  preferBoardId?: string;
  /** Overrides opcionais (testes). */
  maxFiles?: number;
  maxUncompressedBytes?: number;
  maxRatio?: number;
}

const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_UNCOMPRESSED = 200 * 1024 * 1024; // 200 MB
const DEFAULT_MAX_RATIO = 100; // uncompressed/compressed por arquivo

function hasZipSignature(buf: Uint8Array): boolean {
  // PK\x03\x04 (local file header) — export Trello nunca vem vazio/empty.
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

export async function parseTrelloZip(
  bytes: ArrayBuffer | Uint8Array,
  opts: ZipParseOptions = {},
): Promise<TrelloBoardExport> {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!hasZipSignature(buf)) {
    throw new AdapterParseError('Arquivo não é um ZIP válido (assinatura ausente).');
  }

  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const maxUncompressed = opts.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED;
  const maxRatio = opts.maxRatio ?? DEFAULT_MAX_RATIO;

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch (e) {
    throw new AdapterParseError(`ZIP inválido: ${(e as Error).message}`);
  }

  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length > maxFiles) {
    throw new AdapterParseError(`ZIP excede o limite de arquivos internos (${entries.length} > ${maxFiles}).`);
  }

  // Estimativa de tamanho descompactado usando _data.uncompressedSize (interno do JSZip).
  let totalUncompressed = 0;
  for (const f of entries) {
    // deno-lint-ignore no-explicit-any
    const meta: any = (f as any)._data ?? {};
    const uncompressed = Number(meta.uncompressedSize ?? 0);
    const compressed = Number(meta.compressedSize ?? 0);
    totalUncompressed += uncompressed;
    if (totalUncompressed > maxUncompressed) {
      throw new AdapterParseError(`ZIP excede tamanho descompactado permitido (> ${maxUncompressed} bytes).`);
    }
    if (compressed > 0 && uncompressed / compressed > maxRatio) {
      throw new AdapterParseError(`Arquivo interno com razão de compressão suspeita (${f.name}).`);
    }
  }

  const jsonEntries = entries.filter((f) => f.name.toLowerCase().endsWith('.json'));
  if (jsonEntries.length === 0) {
    throw new AdapterParseError('ZIP não contém arquivos .json.');
  }

  // Preferência 1: nome contém o board id explicitamente informado.
  if (opts.preferBoardId) {
    const hit = jsonEntries.find((f) => f.name.includes(opts.preferBoardId!));
    if (hit) {
      const text = await hit.async('string');
      return parseTrelloJson(text);
    }
  }

  // Preferência 2: escolher o .json cujo conteúdo parece um board completo
  // (tem id/name + arrays lists/cards). Isso evita cair no primeiro .json do
  // ZIP quando ele é um arquivo auxiliar (manifest, membro, etc.) sem cards.
  let best: { entry: typeof jsonEntries[number]; text: string; score: number } | null = null;
  for (const entry of jsonEntries) {
    let text: string;
    try { text = await entry.async('string'); } catch { continue; }
    let obj: unknown;
    try { obj = JSON.parse(text); } catch { continue; }
    if (!obj || typeof obj !== 'object') continue;
    const o = obj as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.name !== 'string') continue;
    const lists = Array.isArray(o.lists) ? o.lists.length : 0;
    const cards = Array.isArray(o.cards) ? o.cards.length : 0;
    // Board completo pontua muito mais alto que metadados soltos.
    const score = (lists > 0 || cards > 0 ? 1_000_000 : 0) + lists * 1000 + cards;
    if (!best || score > best.score) best = { entry, text, score };
  }

  if (best) return parseTrelloJson(best.text);

  // Fallback: primeiro .json (comportamento anterior).
  const text = await jsonEntries[0].async('string');
  return parseTrelloJson(text);
}
