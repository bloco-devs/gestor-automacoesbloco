/**
 * NavigationResolver — resolve rotas legadas → rotas canônicas do novo mapa.
 * Usado apenas quando a feature flag `ux.rewrite` estiver ativa.
 */
import { listAliases, listProfiles, getNavigation } from "./registry";
import type { NavigationItem, NavigationProfile } from "./types";

const ALIAS_MAP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const alias of listAliases()) m.set(normalize(alias.from), alias.to);
  return m;
})();

function normalize(path: string): string {
  if (!path) return "/";
  const clean = path.split("?")[0].split("#")[0];
  return clean.length > 1 && clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

/** Resolve uma rota (antiga ou nova) para a rota canônica. */
export function resolveRoute(path: string): string {
  const key = normalize(path);
  return ALIAS_MAP.get(key) ?? key;
}

/** Descobre a qual perfil uma rota canônica pertence. */
export function resolveProfile(path: string): NavigationProfile | null {
  const canonical = resolveRoute(path);
  for (const profile of listProfiles()) {
    const schema = getNavigation(profile);
    for (const group of schema.groups) {
      for (const item of group.items) {
        if (item.route === canonical || canonical.startsWith(item.route + "/")) {
          return profile;
        }
      }
    }
  }
  return null;
}

export function findItem(profile: NavigationProfile, path: string): NavigationItem | null {
  const canonical = resolveRoute(path);
  for (const group of getNavigation(profile).groups) {
    for (const item of group.items) {
      if (item.route === canonical) return item;
    }
  }
  return null;
}
