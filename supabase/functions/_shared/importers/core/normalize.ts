// Normalizadores neutros (sem dependência de origem).

/** Normaliza nome para comparações case/whitespace-insensitivas. */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Normaliza cor CSS: `#abc` -> `#aabbcc`; lower-case; sem espaços. */
export function normalizeColor(s: string | null | undefined): string {
  const raw = (s ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (/^#([0-9a-f]{3})$/.test(raw)) {
    const [, h] = raw.match(/^#([0-9a-f]{3})$/)!;
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return raw;
}

/** Chave estável para comparação de labels: nome normalizado + cor normalizada. */
export function labelKey(nome: string, cor: string): string {
  return `${normalizeName(nome)}|${normalizeColor(cor)}`;
}

/** Chave estável para comparação de colunas: nome normalizado. */
export function colunaKey(nome: string): string {
  return normalizeName(nome);
}

/** Chave estável para comparação de cards dentro de uma coluna. */
export function cardKey(titulo: string): string {
  return normalizeName(titulo);
}

/** Percentual inteiro clamp 0..100. */
export function percent(current: number, total: number): number {
  if (!total || total <= 0) return 0;
  const p = Math.floor((current / total) * 100);
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}
