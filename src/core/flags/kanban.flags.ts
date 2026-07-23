import { registerFlags } from "./registry";

export const KANBAN_FLAGS = {
  multiselect: "kanban.multiselect",
  shortcuts: "kanban.shortcuts",
  contextmenu: "kanban.contextmenu",
  undoRedo: "kanban.undo_redo",
  offlineHistory: "kanban.offline_history",
  dragPreview: "kanban.drag_preview",
} as const;

registerFlags([
  { key: KANBAN_FLAGS.multiselect, category: "kanban", description: "Seleção múltipla e ações em lote", defaultValue: false },
  { key: KANBAN_FLAGS.shortcuts, category: "kanban", description: "Atalhos j/k/enter/x/m/d", defaultValue: false },
  { key: KANBAN_FLAGS.contextmenu, category: "kanban", description: "Menu de contexto radix", defaultValue: false },
  { key: KANBAN_FLAGS.undoRedo, category: "kanban", description: "Undo/Redo por sessão", defaultValue: false },
  { key: KANBAN_FLAGS.offlineHistory, category: "kanban", description: "Histórico local offline com replay", defaultValue: false },
  { key: KANBAN_FLAGS.dragPreview, category: "kanban", description: "Preview visual do destino no drag", defaultValue: false },
]);
