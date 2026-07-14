// Mapeamentos determinísticos do Trello para valores neutros.
// Nenhum acesso a rede. Nenhuma dependência do Runner/Executor.

import { normalizeColor } from '../core/normalize.ts';

/** Paleta oficial do Trello (cores base). */
const TRELLO_COLOR_HEX: Record<string, string> = {
  green:  '#61bd4f',
  yellow: '#f2d600',
  orange: '#ff9f1a',
  red:    '#eb5a46',
  purple: '#c377e0',
  blue:   '#0079bf',
  sky:    '#00c2e0',
  lime:   '#51e898',
  pink:   '#ff78cb',
  black:  '#344563',
  // variantes subtle/dark: colapsam na cor base
  green_dark:  '#519839',
  yellow_dark: '#d9b51c',
  orange_dark: '#cd8313',
  red_dark:    '#b04632',
  purple_dark: '#89609e',
  blue_dark:   '#055a8c',
  sky_dark:    '#0098b7',
  lime_dark:   '#4bbf6b',
  pink_dark:   '#e568af',
  black_dark:  '#091e42',
};

/** Converte cor Trello (nome) em hex canônico. Aceita já-hex. Default cinza. */
export function trelloColorToHex(color: string | null | undefined): string {
  if (!color) return '#b3bac5';
  const k = String(color).trim().toLowerCase();
  if (k.startsWith('#')) return normalizeColor(k);
  return TRELLO_COLOR_HEX[k] ?? '#b3bac5';
}

/** Normaliza ISO 8601 do Trello para string ISO (ou undefined). */
export function trelloDateToIso(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Ordena por `pos` do Trello (float) e devolve o índice inteiro (ordem).
 * O Trello usa doubles para reordenação; o modelo canônico usa inteiros.
 */
export function toOrdemFromPos<T extends { pos?: number | string | null }>(items: T[]): Map<T, number> {
  const withPos = items.map((it, i) => ({
    it,
    p: typeof it.pos === 'number' ? it.pos : Number(it.pos ?? i * 1024),
    i,
  }));
  withPos.sort((a, b) => (a.p - b.p) || (a.i - b.i));
  const out = new Map<T, number>();
  withPos.forEach((x, idx) => out.set(x.it, idx));
  return out;
}

/** true se o estado do checkItem indica concluído. */
export function trelloCheckItemDone(state: string | null | undefined): boolean {
  return String(state ?? '').toLowerCase() === 'complete';
}
