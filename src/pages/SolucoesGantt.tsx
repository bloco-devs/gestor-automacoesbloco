import { useNavigate } from "react-router-dom";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listSolucoes, updateSolucao } from "@/lib/supabaseData";
import { GanttChart, type GanttItem } from "@/components/GanttChart";

export default function SolucoesGantt() {
  const navigate = useNavigate();
  const all = useSupabaseData(() => listSolucoes(), []);

  const items: GanttItem[] = all.map((s) => ({
    id: s.id,
    title: s.titulo,
    subtitle: s.descricao?.slice(0, 60),
    colorClass: "bg-accent/80 text-primary-foreground",
    start: s.dataInicioPrevista ?? null,
    end: s.dataFimPrevista ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cronograma de Soluções</h1>
        <p className="text-sm text-muted-foreground">
          Visão Gantt baseada em datas planejadas. Clique numa barra para editar; clique no nome para abrir a solução.
        </p>
      </div>

      <GanttChart
        items={items}
        onItemClick={(id) => navigate(`/solucoes/${id}`)}
        onSaveDates={async (id, start, end) => {
          await updateSolucao(id, { dataInicioPrevista: start, dataFimPrevista: end });
        }}
        emptyLabel="Nenhuma solução com cronograma definido."
      />
    </div>
  );
}
