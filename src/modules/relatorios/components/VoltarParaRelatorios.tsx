import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * O caminho de volta.
 *
 * As telas de relatório eram becos sem saída: chegava-se nelas pelo menu ou
 * por um botão, e a única saída era o botão do navegador. Só o formulário de
 * fechamento tinha link de volta, porque ali eu tinha pensado no fluxo — nas
 * outras quatro, não.
 *
 * Fica no `breadcrumb` do PageHeader, que é onde o design-system já reserva
 * espaço para isso, em vez de num botão solto competindo com as ações.
 */
function VoltarImpl({ para = "/relatorios", rotulo = "Relatórios" }: {
  para?: string;
  rotulo?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(para)}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-xs transition-all hover:border-primary hover:bg-primary hover:text-slate-950"
    >
      <ArrowLeft className="size-4 stroke-[2.5]" aria-hidden />
      {rotulo}
    </button>
  );
}

export const VoltarParaRelatorios = memo(VoltarImpl);
export default VoltarParaRelatorios;
