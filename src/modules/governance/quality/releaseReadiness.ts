import type { ReadinessItem } from "../types";

/**
 * Checklist estático de prontidão para release.
 * Estados refletem o snapshot da entrega da FEATURE 021.
 */
export const RELEASE_CHECKLIST: ReadinessItem[] = [
  { id: "typecheck", label: "Typecheck", status: "ok", detail: "tsgo --noEmit limpo." },
  { id: "tests", label: "Testes (vitest)", status: "ok", detail: "Suítes verdes na entrega." },
  { id: "lazy", label: "Rotas com lazy-load", status: "ok", detail: "Code-splitting em src/App.tsx." },
  { id: "a11y", label: "Acessibilidade", status: "ok", detail: "ARIA + focus-visible cobrindo shell/nav." },
  { id: "perf", label: "Performance", status: "ok", detail: "memo/useMemo em superfícies quentes." },
  { id: "responsive", label: "Responsividade", status: "ok", detail: "Breakpoints md/lg/xl consistentes." },
  { id: "realtime", label: "Realtime", status: "ok", detail: "Auto-sync do Ecossistema ativo." },
  { id: "analytics", label: "Analytics", status: "ok", detail: "9 fontes agregadas em memória." },
  { id: "observability", label: "Observabilidade IA", status: "ok", detail: "ia_uso_log + /observabilidade-ia." },
  { id: "docs", label: "Documentação", status: "ok", detail: "45 documentos oficiais em docs/." },
  { id: "governance", label: "Governança / Quality Center", status: "ok", detail: "/admin/quality operacional." },
  { id: "copilot", label: "AI Copilot (FEATURE 020)", status: "pending", detail: "Ainda não iniciada." },
];
