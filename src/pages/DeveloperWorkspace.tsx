import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTodasAsDemandas } from "@/modules/demand-access";
import { FILAS, type FilaId, aplicarFila, contarFilas, agrupar, sinaisUteis } from "@/domain/demand";
import { ListaLente } from "@/modules/workspace-demandas/components/ListaLente";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LS_FILA = "hoje:fila:v1";

function lerFilaSalva(): FilaId {
  if (typeof window === "undefined") return "todas";
  const v = window.localStorage.getItem(LS_FILA);
  return FILAS.some((f) => f.id === v) ? (v as FilaId) : "todas";
}

/**
 * Hoje — a fila do desenvolvedor, cruzando as duas fontes.
 *
 * ANTES: esta tela lia só `useDemands()` (tabela `demands`, a fila global do
 * Help Desk). Ficava vazia sempre que a única demanda real do momento vivesse
 * num quadro importado (`atividades_cards`) — que é, hoje, onde está o
 * trabalho de verdade. `useTodasAsDemandas` soma as duas fontes; a UI
 * continua sem saber que existem duas.
 *
 * Reaproveita `ListaLente` e o vocabulário fila/lente já usados no Workspace
 * de projeto — a mesma pergunta ("o que eu vejo"), só que sem recorte de
 * projeto. Abrir uma demanda navega para `/demandas/:id`, a página real —
 * nunca um preview embutido.
 */
export default function DeveloperWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { demandas, projetoPorDemanda, capacidades, carregando } = useTodasAsDemandas();
  const [fila, setFila] = useState<FilaId>(lerFilaSalva);

  const contagens = useMemo(() => contarFilas(demandas, user?.id ?? null), [demandas, user?.id]);
  const filtradas = useMemo(
    () => aplicarFila(demandas, fila, user?.id ?? null),
    [demandas, fila, user?.id],
  );
  const grupos = useMemo(() => agrupar(filtradas, "lista"), [filtradas]);
  const sinais = useMemo(() => sinaisUteis(filtradas), [filtradas]);

  function selecionarFila(f: FilaId) {
    setFila(f);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_FILA, f);
  }

  function abrir(id: string) {
    const projetoId = projetoPorDemanda.get(id);
    navigate(projetoId ? `/demandas/${id}?projeto=${projetoId}` : `/demandas/${id}`);
  }

  return (
    <div className="flex h-[calc(100vh-var(--app-header-h,3.5rem))] w-full flex-col">
      <nav
        aria-label="Fila"
        className="flex h-10 items-center gap-0.5 overflow-x-auto border-b border-border bg-card/40 px-3 md:px-6"
      >
        {FILAS.map((f) => {
          const ativa = f.id === fila;
          const n = contagens[f.id];
          return (
            <button
              key={f.id}
              type="button"
              aria-current={ativa ? "true" : undefined}
              title={f.ajuda}
              onClick={() => selecionarFila(f.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                ativa
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {f.rotulo}
              <span className={cn("tabular-nums", !ativa && "text-muted-foreground/70")}>{n}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
        {carregando ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <ListaLente
            grupos={grupos}
            capacidades={capacidades}
            sinais={sinais}
            onAbrir={abrir}
            vazio={{
              titulo: fila === "todas" ? "Nada por aqui ainda" : "Nada nesta fila",
              descricao:
                fila === "todas"
                  ? "Nenhuma demanda em nenhum projeto no momento."
                  : "Troque de fila ou espere novas demandas chegarem.",
            }}
          />
        )}
      </div>
    </div>
  );
}
