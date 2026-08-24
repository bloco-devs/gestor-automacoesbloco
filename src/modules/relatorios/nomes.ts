/**
 * Nome curto para tabela.
 *
 * "André Laureano dos Santos Silva" não cabe em coluna de tabela, e o
 * `truncate` produzia "André Laureano do..." — que é pior que abreviar,
 * porque corta no meio de uma palavra e não revela o sobrenome.
 *
 * Primeiro nome + último sobrenome resolve: "André Silva" é reconhecível,
 * curto, e nunca fica pela metade. O nome inteiro vai no `title` para quem
 * passar o mouse.
 */
const LIGACOES = new Set(["de", "da", "do", "das", "dos", "e"]);

export function nomeCurto(nome: string | null | undefined): string {
  if (!nome?.trim()) return "—";
  const partes = nome.trim().split(/\s+/).filter((p) => !LIGACOES.has(p.toLowerCase()));
  if (partes.length <= 2) return partes.join(" ");
  return `${partes[0]} ${partes[partes.length - 1]}`;
}
