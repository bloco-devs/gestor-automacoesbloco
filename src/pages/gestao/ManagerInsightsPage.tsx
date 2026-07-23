import { ManagerShell, InsightsTabs } from "@/modules/manager-unified";

/**
 * /gestao/insights — página unificada com abas.
 * Substitui Analytics, Operações, IA, Qualidade, Observabilidade, Plataforma e Segurança
 * como abas de uma única página. Zero tela duplicada.
 */
export default function ManagerInsightsPage() {
  return (
    <ManagerShell>
      <InsightsTabs />
    </ManagerShell>
  );
}
