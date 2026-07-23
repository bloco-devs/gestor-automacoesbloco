/**
 * Ondas 12 — produtividade do desenvolvedor. Persistência em localStorage.
 */
const K_BOOKMARKS = "dx.bookmarks";
const K_RECENT = "dx.recent";
const K_PINNED = "dx.pinned";
const MAX_RECENT = 12;

export interface Bookmark {
  id: string;
  label: string;
  to: string;
  createdAt: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function getBookmarks(): Bookmark[] {
  return read<Bookmark[]>(K_BOOKMARKS, []);
}
export function addBookmark(b: Omit<Bookmark, "id" | "createdAt">): Bookmark[] {
  const list = getBookmarks();
  const next: Bookmark = { ...b, id: crypto.randomUUID?.() ?? String(Date.now()), createdAt: Date.now() };
  const out = [next, ...list.filter((x) => x.to !== b.to)];
  write(K_BOOKMARKS, out);
  return out;
}
export function removeBookmark(id: string): Bookmark[] {
  const out = getBookmarks().filter((b) => b.id !== id);
  write(K_BOOKMARKS, out);
  return out;
}

export function getRecent(): string[] {
  return read<string[]>(K_RECENT, []);
}
export function pushRecent(to: string): string[] {
  const list = [to, ...getRecent().filter((x) => x !== to)].slice(0, MAX_RECENT);
  write(K_RECENT, list);
  return list;
}

export function getPinnedPanels(): string[] {
  return read<string[]>(K_PINNED, []);
}
export function togglePinnedPanel(id: string): string[] {
  const cur = getPinnedPanels();
  const out = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  write(K_PINNED, out);
  return out;
}
