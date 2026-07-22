export { useEcossistemaMatch } from "./hooks/useEcossistemaMatch";
export type { EcossistemaCandidato } from "./hooks/useEcossistemaMatch";
export {
  trackDuplicatePrevention,
  readDuplicatePreventionMetrics,
  markDemandIgnoredSuggestion,
  hasIgnoredSuggestion,
} from "./utils/duplicatePreventionAnalytics";
export type { DuplicatePreventionEvent } from "./utils/duplicatePreventionAnalytics";
