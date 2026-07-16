// Fundos de quadro compartilhados entre a página do quadro e a listagem.
// A escolha do usuário é persistida em localStorage por board (por usuário).

export interface BgOption {
  key: string;
  label: string;
  className: string;
  swatch: string;
}

export const BG_OPTIONS: BgOption[] = [
  { key: "none",    label: "Padrão",     className: "",                                                                                                            swatch: "bg-muted" },
  { key: "slate",   label: "Ardósia",    className: "bg-slate-100 dark:bg-slate-900/40",                                                                            swatch: "bg-slate-400" },
  { key: "sky",     label: "Céu",        className: "bg-gradient-to-br from-sky-100 to-sky-200 dark:from-sky-950/60 dark:to-sky-900/40",                            swatch: "bg-sky-400" },
  { key: "emerald", label: "Menta",      className: "bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950/60 dark:to-emerald-900/40",            swatch: "bg-emerald-400" },
  { key: "amber",   label: "Âmbar",      className: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/60 dark:to-amber-900/40",                    swatch: "bg-amber-400" },
  { key: "rose",    label: "Rosa",       className: "bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-950/60 dark:to-rose-900/40",                        swatch: "bg-rose-400" },
  { key: "violet",  label: "Violeta",    className: "bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-950/60 dark:to-violet-900/40",                swatch: "bg-violet-400" },
  { key: "dusk",    label: "Crepúsculo", className: "bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 dark:from-indigo-950/70 dark:via-purple-950/60 dark:to-pink-950/50", swatch: "bg-gradient-to-br from-indigo-400 to-pink-400" },
  { key: "ocean",   label: "Oceano",     className: "bg-gradient-to-br from-cyan-200 via-sky-200 to-blue-300 dark:from-cyan-950/70 dark:via-sky-950/60 dark:to-blue-950/50",           swatch: "bg-gradient-to-br from-cyan-400 to-blue-500" },
];

export const boardBgKey    = (boardId: string) => `atividades:boardBg:${boardId}`;
export const boardBgImgKey = (boardId: string) => `atividades:boardBgImg:${boardId}`;
export const boardBgUrlCacheKey = (path: string) => `atividades:boardBgUrl:${path}`;

export function readBoardBg(boardId: string): { key: string; imgPath: string | null } {
  try {
    return {
      key: localStorage.getItem(boardBgKey(boardId)) || "none",
      imgPath: localStorage.getItem(boardBgImgKey(boardId)),
    };
  } catch {
    return { key: "none", imgPath: null };
  }
}

export function readCachedBgUrl(path: string): string | null {
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  try {
    const raw = sessionStorage.getItem(boardBgUrlCacheKey(path));
    if (!raw) return null;
    const { url, exp } = JSON.parse(raw) as { url: string; exp: number };
    return url && exp > Date.now() ? url : null;
  } catch {
    return null;
  }
}
