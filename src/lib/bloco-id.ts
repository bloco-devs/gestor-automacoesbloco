// Constante única do launcher do Bloco ID.
// Lê de VITE_BLOCO_ID_LAUNCHER_URL com fallback para o launcher padrão.
export const BLOCO_ID_LAUNCHER_URL: string =
  (import.meta.env.VITE_BLOCO_ID_LAUNCHER_URL as string | undefined)?.trim() ||
  "https://blocoid.lovable.app";

// Slug deste sistema no hub do Bloco ID.
export const BLOCO_ID_APP_SLUG = "automacoes";

export function blocoIdLoginUrl(abrir: string = BLOCO_ID_APP_SLUG): string {
  const base = BLOCO_ID_LAUNCHER_URL.replace(/\/+$/, "");
  return `${base}/?abrir=${encodeURIComponent(abrir)}`;
}
