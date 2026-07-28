/**
 * FEATURE 026.1 — Unified Navigation module.
 * Feature-flag: `ux.rewrite`. Aditivo. Nenhuma feature removida.
 */
export type { NavigationAlias, NavigationGroup, NavigationItem, NavigationProfile, NavigationSchema } from "./types";
export { getNavigation, listAliases, listProfiles } from "./registry";
export { resolveRoute, resolveProfile, findItem } from "./resolver";
export { ProductGlossary, LEGACY_TERMS, normalizeTerm } from "./glossary";
