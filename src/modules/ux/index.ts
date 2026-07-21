/**
 * Human First UX — módulo público.
 * Consumir apenas via estes exports; nunca importar arquivos internos.
 */
export { LanguageProvider, useLanguage, personaFromRole } from "./language/providers/LanguageProvider";
export { useT, usePersona, useIsLayUser, useTerms, useFriendlyError, resolveFriendlyError } from "./language/hooks";
export { DICTIONARIES, SOLICITANTE_DICT, TECNICA_DICT, GESTOR_DICT, FRIENDLY_ERRORS, translate, DEFAULT_PERSONA } from "./language/dictionary";
export { EMPTY_STATES, MICROCOPY } from "./language/labels";
export type { Persona, TermKey, LanguageMap, FriendlyError, FriendlyErrorKey } from "./language/types";
