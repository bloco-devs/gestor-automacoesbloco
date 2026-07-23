import { registerFlags } from "./registry";

export const DASHBOARD_FLAGS = {
  custom: "dashboard.custom",
  smartWidgets: "dashboard.smart_widgets",
} as const;

registerFlags([
  { key: DASHBOARD_FLAGS.custom, category: "dashboard", description: "Dashboard customizável com DnD", defaultValue: false },
  { key: DASHBOARD_FLAGS.smartWidgets, category: "dashboard", description: "Widgets inteligentes (SLA, IA Insights, etc)", defaultValue: false },
]);
