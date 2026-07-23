// Registra todas as categorias em import-time.
import "./kanban.flags";
import "./dashboard.flags";
import "./workflow.flags";
import "./automation.flags";
import "./ai.flags";
import "./ux.flags";

export * from "./types";
export {
  registerFlag,
  registerFlags,
  listFlags,
  getFlagDefinition,
  isFlagEnabled,
  setFlagOverride,
  __resetFlagRegistry,
} from "./registry";

export { KANBAN_FLAGS } from "./kanban.flags";
export { DASHBOARD_FLAGS } from "./dashboard.flags";
export { WORKFLOW_FLAGS } from "./workflow.flags";
export { AUTOMATION_FLAGS } from "./automation.flags";
export { AI_FLAGS } from "./ai.flags";
export { UX_FLAGS } from "./ux.flags";
