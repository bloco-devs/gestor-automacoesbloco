import { registerFlags } from "./registry";

/** Mantém compatibilidade com a flag legada `ux.rewrite` já usada em navigation/. */
export const UX_FLAGS = {
  rewrite: "ux.rewrite",
  globalSearch: "global.search",
  savedFilters: "filters.saved",
  unifiedTimeline: "timeline.unified",
  templates: "templates",
} as const;

registerFlags([
  { key: UX_FLAGS.rewrite, category: "ux", description: "Nova UX estilo Linear/Notion", defaultValue: true },
  { key: UX_FLAGS.globalSearch, category: "search", description: "Busca global unificada", defaultValue: false },
  { key: UX_FLAGS.savedFilters, category: "search", description: "Filtros favoritos por usuário", defaultValue: false },
  { key: UX_FLAGS.unifiedTimeline, category: "timeline", description: "Timeline unificada multi-fonte", defaultValue: false },
  { key: UX_FLAGS.templates, category: "templates", description: "Sistema de templates", defaultValue: false },
]);
