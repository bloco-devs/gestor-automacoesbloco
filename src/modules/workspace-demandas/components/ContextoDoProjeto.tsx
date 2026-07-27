import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Inbox, LayoutGrid } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Resumo } from "@/domain/demand";
import { INBOX_ID, useProjetos, type ProjetoAtual } from "@/modules/demand-access";

/**
 * O contexto do projeto — agora dentro do header global de 40px.
 *
 * O QUE ISTO SUBSTITUI
 * Uma faixa própria de 84px com título, descrição em uma linha, barra de
 * progresso, contadores, avatares e "ativo hoje". Nada daquilo era falso; o
 * problema é que tudo ficava permanentemente na tela para ser lido uma vez.
 *
 * O que sobrou obedece a um critério: fica quem muda de valor e muda decisão.
 *   nome do projeto  — sim, é a resposta de "onde estou"
 *   progresso        — sim, muda toda hora
 *   sem responsável  — sim, e é acionável (clicar aplica a fila)
 *   em risco         — sim, quando existe; quando é zero, não ocupa espaço
 *   descrição        — não. Vai para o `title` do nome.
 *   avatares         — não. A carga por pessoa já está no Copiloto, com número.
 *   "ativo hoje"     — não. Uma data de última movimentação não muda o que
 *                      você faz nos próximos cinco minutos.
 *
 * O `⌄` ao lado do nome é o seletor de projeto. Ele existe aqui para que trocar
 * de projeto deixe de exigir uma viagem à página de quadros — que era o último
 * ponto do fluxo com vocabulário de Trello.
 */

interface Props {
  projeto: ProjetoAtual;
  resumo: Resumo;
  onFila: (fila: "em_risco" | "sem_responsavel") => void;
}

function ContextoDoProjetoImpl({ projeto, resumo, onFila }: Props) {
  const navigate = useNavigate();
  const { projetos } = useProjetos();

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="size-[18px] shrink-0 overflow-hidden rounded-[5px] border border-border/60 bg-muted"
        style={!projeto.capaUrl && projeto.cor ? { backgroundColor: projeto.cor } : undefined}
      >
        {projeto.capaUrl ? <img src={projeto.capaUrl} alt="" className="size-full object-cover" /> : null}
      </span>

      <Popover>
        <PopoverTrigger
          className={cn(
            "flex min-w-0 items-center gap-1 rounded px-1 -mx-1 text-[13px] font-medium text-foreground",
            "transition-colors hover:bg-muted/60",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
          title={projeto.descricao ?? projeto.nome}
        >
          <span className="truncate">{projeto.nome}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          <p className="ds-caption px-2 py-1.5 text-muted-foreground">Ir para</p>
          {/* A Inbox aparece aqui pelo mesmo motivo que aparece na seleção:
              para quem navega ela é um destino irmão dos projetos. */}
          <button
            type="button"
            onClick={() => navigate(`/workspace/demandas/${INBOX_ID}`)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
              "transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted",
            )}
          >
            <Check className="size-3.5 shrink-0 opacity-0" aria-hidden />
            <Inbox className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate">Inbox</span>
          </button>
          {projetos.map((p) => {
            const atual = p.id === projeto.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/workspace/demandas/${p.id}`)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
                  "transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted",
                  atual && "font-medium",
                )}
              >
                <Check className={cn("size-3.5 shrink-0", atual ? "opacity-100" : "opacity-0")} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">{p.abertas}</span>
              </button>
            );
          })}
          {/* A troca rápida não substitui a tela de projetos: ela é o atalho
              para quem já sabe o destino. Quem está comparando precisa ver
              abertas, pessoas e última movimentação lado a lado. */}
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

      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <span className="h-1 w-12 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span
            className="block h-full rounded-full bg-foreground/60 transition-[width] duration-slow ease-standard"
            style={{ width: `${resumo.progresso}%` }}
          />
        </span>
        <span className="tabular-nums text-foreground">
          {resumo.concluidas}/{resumo.total}
        </span>
      </span>

      {resumo.semResponsavel > 0 && (
        <button
          type="button"
          onClick={() => onFila("sem_responsavel")}
          className="hidden shrink-0 rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:inline"
        >
          <span className="tabular-nums text-foreground">{resumo.semResponsavel}</span> sem dono
        </button>
      )}

      {resumo.emRisco > 0 && (
        <button
          type="button"
          onClick={() => onFila("em_risco")}
          className="hidden shrink-0 items-center gap-1.5 rounded px-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:inline-flex"
        >
          <span className="size-1.5 rounded-full bg-destructive" aria-hidden />
          <span className="tabular-nums text-foreground">{resumo.emRisco}</span> em risco
        </button>
      )}
    </div>
  );
}

export const ContextoDoProjeto = memo(ContextoDoProjetoImpl);
