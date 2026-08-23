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
      className="inline-flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      {rotulo}
    </button>
  );
}

export const VoltarParaRelatorios = memo(VoltarImpl);
export default VoltarParaRelatorios;
