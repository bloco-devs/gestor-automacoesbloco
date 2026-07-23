export const PLATFORM = {
  BOOT_TIMEOUT_MS: 8000,
  REALTIME_RETRY_MS: 2000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_UPLOAD_MB: 20,
  MAX_CARDS_PER_QUERY: 500,
} as const;

export const CACHE_KEYS = {
  savedFilters: "saved_filters",
  dashboardLayout: "dashboard_layout",
  workspaceDrafts: "workspace_drafts",
  kanbanUndo: "kanban_undo",
  aiResponse: "ai_response",
} as const;
