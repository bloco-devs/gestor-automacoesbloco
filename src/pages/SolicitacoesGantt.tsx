import { useNavigate } from "react-router-dom";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listSolicitacoes, updateSolicitacao } from "@/lib/supabaseData";
import { STATUS_LABEL } from "@/lib/types";
import { GanttChart, type GanttItem } from "@/components/GanttChart";

const STATUS_COLOR: Record<string, string> = {
  novo: "bg-muted text-foreground",
  em_analise: "bg-info/70 text-primary-foreground",
  aprovado: "bg-secondary text-secondary-foreground",
  em_desenvolvimento: "bg-warning/80 text-primary-foreground",
  testando: "bg-info/70 text-primary-foreground",
  pronto: "bg-success/80 text-primary-foreground",
  em_producao: "bg-accent/80 text-primary-foreground",
};

export default function SolicitacoesGantt() {
  const navigate = useNavigate();
  const all = useSupabaseData(() => listSolicitacoes(), []);

  const items: GanttItem[] = all.map((s) => ({
    id: s.id,
    title: s.titulo,
    subtitle: `${STATUS_LABEL[s.status]} · ${s.solicitanteNome}`,
    colorClass: STATUS_COLOR[s.status],
    start: s.dataInicioPrevista ?? null,
    end: s.dataFimPrevista ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cronograma de Demandas</h1>
        <p className="text-sm text-muted-foreground">
          Visão Gantt baseada em datas planejadas. Clique numa barra para editar; clique no nome para abrir a demanda.
        </p>
      </div>

      <GanttChart
        items={items}
        onItemClick={(id) => navigate(`/solicitacao/${id}`)}
        onSaveDates={async (id, start, end) => {
          await updateSolicitacao(id, { dataInicioPrevista: start, dataFimPrevista: end });
        }}
        emptyLabel="Nenhuma demanda com cronograma definido."
      />
    </div>
  );
}
