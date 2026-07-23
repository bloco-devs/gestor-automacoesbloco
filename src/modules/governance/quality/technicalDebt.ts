import type { TechnicalDebtItem } from "../types";

/**
 * Débitos técnicos rastreados manualmente (fonte de verdade).
 * Não escaneia código em runtime — mantido curado por módulo.
 */
export const TECHNICAL_DEBT: TechnicalDebtItem[] = [
  { module: "atividades", kind: "risk", message: "BoardSettingsDialog (~60KB) — quebrar em subcomponentes.", path: "src/components/atividades/quadros/BoardSettingsDialog.tsx" },
  { module: "solicitacoes", kind: "risk", message: "SolicitacaoDetail (~52KB) — extrair seções em módulos.", path: "src/pages/SolicitacaoDetail.tsx" },
  { module: "diagrama", kind: "risk", message: "Diagrama (~50KB) — separar camadas HUB/local.", path: "src/pages/Diagrama.tsx" },
  { module: "atividades", kind: "roadmap", message: "G10 — reorder intra-coluna.", },
  { module: "solucoes", kind: "roadmap", message: "G11 — toggle A/B do SolucoesKanban." },
  { module: "listas", kind: "roadmap", message: "G14 — paginação/virtualização para listas longas." },
  { module: "ecossistema", kind: "risk", message: "Conectores comercial-leitura/obra-leitura com falha real elevada — investigar no lado do Financeiro/leitura." },
  { module: "supabaseData", kind: "todo", message: "Comentário residual sobre TODOS os campos relevantes para nova UI de score.", path: "src/lib/supabaseData.ts" },
  { module: "governance", kind: "pending", message: "AI Copilot (FEATURE 020) — planejada e dependente desta feature." },
];
