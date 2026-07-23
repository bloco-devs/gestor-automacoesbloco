export { useEcossistemaMatch } from "./hooks/useEcossistemaMatch";
export type { EcossistemaCandidato } from "./hooks/useEcossistemaMatch";
export {
  trackDuplicatePrevention,
  readDuplicatePreventionMetrics,
  markDemandIgnoredSuggestion,
  hasIgnoredSuggestion,
} from "./utils/duplicatePreventionAnalytics";
export type { DuplicatePreventionEvent } from "./utils/duplicatePreventionAnalytics";

// F018.3 — Ecossistema Ativo
export { useEcossistemaSaude } from "./hooks/useEcossistemaSaude";
export type { EcossistemaSaudeResult, SistemaMetric } from "./hooks/useEcossistemaSaude";
export { useEcossistemaAutoSync } from "./hooks/useEcossistemaAutoSync";
export { EcossistemaSaudeCard } from "./components/EcossistemaSaudeCard";
export { EcossistemaLivePanel } from "./components/EcossistemaLivePanel";
export {
  scheduleReprocessarMatches,
  cancelPendingReprocessamentos,
} from "./services/reprocessador";
export {
  logEcossistemaEvent,
  readEcossistemaEvents,
  readLastEcossistemaEvent,
} from "./utils/observability";
export type { EcossistemaEvent, EcossistemaEventEntry } from "./utils/observability";
