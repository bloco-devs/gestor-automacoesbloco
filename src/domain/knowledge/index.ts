/**
 * Bounded context `knowledge` — barrel público.
 *
 * O ciclo que este módulo fecha:
 *   Demanda resolvida → rascunho → pessoa aprova → artigo → próxima demanda
 *
 * A IA prepara. Quem publica é gente.
 */
export * from "./types";
export * from "./services/rascunho";
