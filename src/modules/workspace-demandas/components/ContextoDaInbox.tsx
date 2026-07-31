import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Inbox, LayoutGrid } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProjetos } from "@/modules/demand-access";

/**
 * O que o header mostra quando a fila aberta é a Inbox.
 *
 * POR QUE NÃO REUSAR `ContextoDoProjeto`
 * Aquele componente descreve um projeto: capa, cor, progresso, carga da
 * equipe. A Inbox não tem nada disso — ela tem uma pergunta só, *quanto
 * ainda não foi classificado*, e essa é a única informação que faz alguém
 * decidir entrar aqui. Forçar o componente do projeto a aceitar "sem
 * projeto" acabaria enchendo o header de campos vazios.
 *
 * O seletor de destino continua existindo, porque para quem navega a Inbox é
 * um irmão dos projetos, não um lugar separado do resto do produto.
 */
function ContextoDaInboxImpl({ aguardando }: { aguardando: number }) {
  const navigate = useNavigate();
  const { projetos } = useProjetos();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border/60 bg-muted"
      >
        <Inbox className="size-3 text-muted-foreground" />
      </span>

      <Popover>
        <PopoverTrigger
          className={cn(
            "flex min-w-0 items-center gap-1 rounded px-1 -mx-1 text-[13px] font-medium text-foreground",
            "transition-colors hover:bg-muted/60",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
          title="Demandas que ainda não foram classificadas em um projeto"
        >
          <span className="truncate">Caixa de Entrada</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <p className="ds-caption px-2 py-1.5 text-muted-foreground">Ir para</p>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium",
              "transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted",
            )}
          >
            <Check className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">Caixa de Entrada</span>
            <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">{aguardando}</span>
          </button>
          {projetos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/workspace/demandas/${p.id}`)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
                "transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted",
              )}
            >
              <Check className="size-3.5 shrink-0 opacity-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{p.nome}</span>
              <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">{p.abertas}</span>
            </button>
          ))}
          <div className="mt-1 border-t border-border/60 pt-1">
            <button
              type="button"
              onClick={() => navigate("/workspace/demandas")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:bg-muted"
            >
              <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
              Todos os projetos
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <span className="h-4 w-px shrink-0 bg-border" aria-hidden />

      {/* A Inbox não tem progresso: ela tem espera. O número que importa é
          quanto está parado aguardando alguém decidir a que projeto pertence. */}
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        {aguardando > 0 ? (
          <>
            <span className="tabular-nums text-foreground">{aguardando}</span>
            aguardando classificação
          </>
        ) : (
          <span>nada aguardando classificação</span>
        )}
      </span>
    </div>
  );
}

export const ContextoDaInbox = memo(ContextoDaInboxImpl);
