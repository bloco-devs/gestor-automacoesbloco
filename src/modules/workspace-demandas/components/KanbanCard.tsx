/**
 * Cartão do Kanban (componente de apresentação) + paleta de cores de etapa.
 *
 * RAZÃO DE EXISTIR COMO ARQUIVO SEPARADO
 * `BoardLente` precisa de `KanbanCardOverlay`; `KanbanCardOverlay` precisa de
 * `Cartao`; se `Cartao` vivesse em `BoardLente`, haveria dependência circular:
 *
 *   BoardLente → KanbanCardOverlay → BoardLente  ❌
 *
 * Extraindo `Cartao` (e `PALETA`, co-dependente) para um arquivo neutro,
 * ambos os consumidores importam sem fechar nenhum loop:
 *
 *   BoardLente     ← KanbanCard ✓
 *   KanbanCardOverlay ← KanbanCard ✓
 */
import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Ban,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Eye,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { labelColorStyle } from "@/lib/atividades";
import {
  PRIORIDADE_ROTULO,
  RISCO_ROTULO,
  type Capacidades,
  type Demanda,
  type SinaisUteis,
  type TomDaEtapa,
} from "@/domain/demand";
import type { CapaResolvida } from "@/modules/demand-access";
import { useEtiquetasExpandidas } from "./card/etiquetasExpandidas";

// ─── Helpers internos ────────────────────────────────────────────────────────

const COR_RISCO: Record<string, string> = {
  sla_estourado: "bg-destructive",
  atrasada: "bg-destructive",
  vence_hoje: "bg-warning",
  sla_atencao: "bg-warning",
  parada: "bg-warning/60",
  vence_em_breve: "bg-info",
};

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Data curta ("12 mar") — o cartão não tem largura para data completa. */
function prazoCurto(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

// ─── PALETA ──────────────────────────────────────────────────────────────────

/**
 * A TINTA DA COLUNA
 *
 * Cada tom aparece em quatro lugares do cabeçalho — ícone, fundo do ícone,
 * texto e a régua embaixo — e em nenhum outro. O corpo da coluna e os cartões
 * continuam sem cor de estado.
 *
 * Isso é deliberado. Se o cartão também fosse tingido, a cor deixaria de
 * responder "em que etapa isto está?" (que o cartão já responde pela posição)
 * e passaria a competir com os sinais que ELE precisa carregar: risco, SLA,
 * prioridade. Duas informações disputando o mesmo canal, e a mais importante
 * perdendo.
 *
 * O cabeçalho é o lugar certo porque é o que se lê de longe. A pergunta que
 * cor responde bem — "tem muito vermelho neste board?" — é uma pergunta de
 * visão periférica, e visão periférica não lê cartão, lê coluna.
 *
 * As cores saem dos tokens semânticos do sistema, não de valores fixos: elas
 * já têm variante para o tema escuro. As opacidades baixas são o que separa
 * "tinta" de "bloco de cor" — fundo sólido no cabeçalho pesaria mais que os
 * cartões, e o cabeçalho é a moldura, não o conteúdo.
 */
export const PALETA: Record<
  TomDaEtapa,
  {
    icone: typeof Circle;
    texto: string;
    fundo: string;
    regua: string;
    pastilha: string;
    borda: string;
  }
> = {
  neutro: {
    icone: Circle,
    texto: "text-muted-foreground",
    fundo: "bg-muted",
    regua: "bg-border",
    pastilha: "bg-muted text-muted-foreground",
    borda: "border-l-border",
  },
  andamento: {
    icone: CircleDot,
    texto: "text-warning",
    fundo: "bg-warning/10",
    regua: "bg-warning/50",
    pastilha: "bg-warning/10 text-warning",
    borda: "border-l-warning",
  },
  revisao: {
    icone: Eye,
    texto: "text-info",
    fundo: "bg-info/10",
    regua: "bg-info/50",
    pastilha: "bg-info/10 text-info",
    borda: "border-l-info",
  },
  concluido: {
    icone: CheckCircle2,
    texto: "text-success",
    fundo: "bg-success/10",
    regua: "bg-success/50",
    pastilha: "bg-success/10 text-success",
    borda: "border-l-success",
  },
  bloqueado: {
    icone: Ban,
    texto: "text-destructive",
    fundo: "bg-destructive/10",
    regua: "bg-destructive/50",
    pastilha: "bg-destructive/10 text-destructive",
    borda: "border-l-destructive",
  },
};

// ─── Cartao ──────────────────────────────────────────────────────────────────

export function Cartao({
  demanda: d,
  capacidades,
  sinais,
  onAbrir,
  arrastavel,
  sobreposicao,
  onAssumir,
  assumindo,
  onConcluir,
  concluindo,
  onExcluir,
  excluindo,
  colunaRotulo,
  colunaId,
  tom = "neutro",
  capa,
  emProjeto,
}: {
  demanda: Demanda;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  /**
   * Quadro de projeto (não Helpdesk). No projeto o cartão já vive dentro de um
   * contexto nomeado: o código de rastreio e o círculo tracejado de "sem
   * responsável" são ruído — a bolinha de conclusão é a única marca circular.
   */
  emProjeto?: boolean;
  /** O tom da etapa onde o cartão está — vira a faixa de cor na borda esquerda. */
  tom?: TomDaEtapa;
  onAbrir?: (id: string) => void;
  arrastavel: boolean;
  sobreposicao?: boolean;
  /**
   * Quem sabe atribuir é a tela — ela conhece a fonte da demanda. Sem este
   * callback o cartão continua exatamente como era: círculo tracejado.
   */
  onAssumir?: (id: string) => void;
  assumindo?: boolean;
  /**
   * Concluir direto da capa (estilo Trello). Sem este callback a bolinha não
   * aparece — quem sabe se existe etapa de conclusão é a tela.
   */
  onConcluir?: (id: string) => void;
  concluindo?: boolean;
  /**
   * Excluir definitivamente. Só a tela sabe se a demanda mora numa tabela onde
   * apagar é uma operação legítima — sem este callback o botão não existe.
   */
  onExcluir?: (id: string) => void;
  excluindo?: boolean;
  /** Nome da coluna onde o cartão está — usado para reconhecer conclusão pelo texto. */
  colunaRotulo?: string;
  /** Id da coluna onde o cartão está — viaja no `data` do sortable. */
  colunaId?: string;
  /**
   * A CAPA — etiquetas e membros do cartão, lidos em lote pela tela.
   * Opcional de propósito: na Inbox (fonte `demands`) não existe etiqueta de
   * quadro nem membro de cartão, e o cartão fica exatamente como era.
   */
  capa?: CapaResolvida;
}) {
  /**
   * `useSortable` no lugar de `useDraggable`: é ele que faz os vizinhos
   * DESLIZAREM para abrir espaço enquanto o cartão está na mão. Sem isto o
   * arrasto só reconhecia a coluna, e soltar no meio da fila não movia nada.
   *
   * `data.colunaId` viaja com o cartão para que o `onDragEnd` saiba, sem
   * procurar, de qual coluna o alvo do drop veio.
   */
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: d.id,
    disabled: !arrastavel || sobreposicao,
    data: { tipo: "cartao" as const, colunaId },
  });
  const estiloDeArrasto = sobreposicao
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  /**
   * MEMBROS SEM DUPLICATA — um usuário, uma foto.
   * Estados antigos deixaram o mesmo responsável repetido no payload; a capa
   * não pode desenhar duas vezes a mesma pessoa. Deduplicação por id,
   * preservando a ordem de chegada.
   */
  const membros = useMemo(() => {
    const porId = new Map<string, NonNullable<typeof capa>["membros"][number]>();
    for (const m of capa?.membros ?? []) if (!porId.has(m.id)) porId.set(m.id, m);
    return [...porId.values()];
  }, [capa?.membros]);





  // A escolha vale para todos os cartões e sobrevive à navegação.
  const [labelsExpanded, alternarLabels] = useEtiquetasExpandidas();
  const responsavel = d.responsaveis[0];

  const sistemaNome = sinais.sistema ? d.sistema?.nome ?? null : null;

  const meta = [
    sinais.prioridade && d.prioridade ? PRIORIDADE_ROTULO[d.prioridade] : null,
    // O código de rastreio é linguagem de Helpdesk: dentro de um quadro de
    // projeto ninguém cita "#4e6706", cita o título do cartão.
    !emProjeto && sinais.referencia ? d.referencia : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const podeAssumir = !responsavel && !!onAssumir && !sobreposicao;
  const podeConcluir = !!onConcluir && !sobreposicao;
  // Conclusão reconhecida de duas formas: pelo tom da etapa (regra da paleta) e
  // pelo próprio nome da coluna, sem depender de acento ou caixa — "Concluída",
  // "CONCLUIDO" e "Concluídas" contam todas.
  const nomeDaColuna = (colunaRotulo ?? "").toLowerCase();
  const colunaDeConclusao =
    tom === "concluido" ||
    nomeDaColuna.includes("concluíd") ||
    nomeDaColuna.includes("concluid") ||
    nomeDaColuna.includes("finaliz") ||
    nomeDaColuna.includes("done");
  const podeExcluir = !!onExcluir && !sobreposicao && colunaDeConclusao;

  const direita = (
    <span className="ds-caption flex shrink-0 items-center gap-1.5 text-muted-foreground">
      {capacidades.ia && d.ia && (
        <Sparkles className="size-3 shrink-0 text-primary" aria-label="Atendida pela IA" />
      )}
      {capacidades.progresso && sinais.progresso && d.progresso && (
        <span className="tabular-nums">{d.progresso.percentual}%</span>
      )}
      {responsavel ? (
        <Avatar className="size-4" title={responsavel.nome}>
          {responsavel.avatarUrl && (
            <AvatarImage src={responsavel.avatarUrl} alt={responsavel.nome} />
          )}
          <AvatarFallback className="bg-muted text-[8px]">
            {iniciais(responsavel.nome)}
          </AvatarFallback>
        </Avatar>
      ) : podeAssumir ? (
        /* O drag do dnd-kit escuta pointer, e o cartão inteiro abre no click:
           parar os dois é o que separa "assumir" de "abrir" ou "arrastar". */
        <button
          type="button"
          disabled={assumindo}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAssumir?.(d.id);
          }}
          title="Atribuir esta demanda a você"
          className={cn(
            "rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium leading-none",
            "text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            "disabled:cursor-progress disabled:opacity-60",
          )}
        >
          {assumindo ? "Assumindo…" : "Assumir"}
        </button>
      ) : emProjeto ? null : (
        /* No projeto a única marca circular do cartão é a bolinha de concluir. */
        <span
          className="size-4 rounded-full border border-dashed border-border"
          title="Sem responsável"
        />
      )}
    </span>
  );

  return (
    <div
      data-testid="card-demanda"
      data-card-id={d.id}
      data-concluida={d.concluida ? "true" : "false"}
      data-coluna={colunaRotulo}
      style={estiloDeArrasto}
      /**
       * A linha no topo mostra onde o cartão vai cair.
       *
       * Sem ela a pessoa solta às cegas e descobre a posição depois — e se
       * errou, arrasta de novo. Um alvo invisível transforma cada movimento
       * numa tentativa.
       */
      ref={sobreposicao ? undefined : setNodeRef}
      {...(sobreposicao ? {} : listeners)}
      {...(sobreposicao ? {} : attributes)}
      onClick={() => {
        if (isDragging || sobreposicao) return;
        onAbrir?.(d.id);
      }}
      role={sobreposicao ? undefined : "button"}
      tabIndex={sobreposicao ? undefined : 0}
      onKeyDown={(e) => {
        if (sobreposicao) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir?.(d.id);
        }
      }}
      aria-label={sobreposicao ? undefined : `Abrir demanda ${d.titulo}`}
      className={cn(
        // PROFUNDIDADE POR SUPERFÍCIE, NÃO POR SOMBRA
        "group relative rounded-lg border border-border/70 bg-card px-2.5 py-2 outline-none",
        podeExcluir && "pb-8",
        // FAIXA DE ETAPA — borda esquerda colorida pelo tom da coluna.
        "border-l-4",
        PALETA[tom].borda,
        "shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]",
        "transition-[background-color,border-color,box-shadow,transform] duration-fast ease-standard",
        "hover:-translate-y-px hover:border-border hover:shadow-elev-2",
        // CURSOR — mão aberta em repouso, mão fechada ao pressionar.
        arrastavel ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        // PLACEHOLDER ESTILO TRELLO — fica invisível mas reserva o espaço exato.
        isDragging && !sobreposicao && "opacity-50",
        // OVERLAY — sem anel extra; a elevação já comunica "na mão".
        sobreposicao && "cursor-grabbing select-none",
        d.concluida && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 h-9 w-1 shrink-0 rounded-full",
            d.risco ? COR_RISCO[d.risco] : "bg-transparent",
          )}
          title={d.risco ? RISCO_ROTULO[d.risco] : undefined}
        />
        <div className="min-w-0 flex-1">
          {(capa?.etiquetas.length ?? 0) > 0 && (
            /* BARRAS DE ETIQUETA — clique expande para mostrar o nome. */
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                alternarLabels();
              }}
              aria-expanded={labelsExpanded}
              aria-label={labelsExpanded ? "Recolher etiquetas" : "Expandir etiquetas"}
              className="mb-1.5 flex flex-wrap items-center gap-1 rounded-md"
            >
              {capa!.etiquetas.map((e) => (
                <span
                  key={e.id}
                  title={e.nome ?? "Etiqueta"}
                  className={cn(
                    "overflow-hidden whitespace-nowrap rounded-md text-[10px] font-medium leading-tight transition-all duration-300 ease-in-out",
                    labelsExpanded ? "h-auto w-auto px-2 py-0.5" : "h-2 w-10",
                  )}
                  style={labelColorStyle(e.cor)}
                >
                  <span
                    className={cn(
                      "transition-opacity duration-300 ease-in-out",
                      labelsExpanded ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {labelsExpanded ? e.nome || "Sem nome" : ""}
                  </span>
                </span>
              ))}
            </button>
          )}

          {sistemaNome && (
            <span
              title={`Sistema: ${sistemaNome}`}
              className="mb-1 inline-flex max-w-full items-center truncate rounded-sm bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              {sistemaNome}
            </span>
          )}

          <div className="flex items-start gap-2">
            {podeConcluir && (
              <button
                type="button"
                disabled={concluindo}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onConcluir?.(d.id);
                }}
                data-testid="cartao-concluir"
                data-concluida={d.concluida ? "true" : "false"}
                title={d.concluida ? "Concluída" : "Marcar como concluída"}
                aria-label={d.concluida ? "Concluída" : "Marcar como concluída"}
                className={cn(
                  "mt-0.5 shrink-0 rounded-full transition-opacity duration-200",
                  d.concluida
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                  "text-muted-foreground hover:text-foreground",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "disabled:cursor-progress",
                )}
              >
                {d.concluida ? (
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                ) : (
                  <Circle className="size-4 transition-colors duration-200" aria-hidden />
                )}
              </button>
            )}

            <p
              className={cn(
                "line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-snug",
                d.concluida && "line-through",
              )}
            >
              {d.titulo}
            </p>
            {!meta && direita}
          </div>

          {meta && (
            <div className="ds-caption mt-1 flex items-center gap-1.5 text-muted-foreground">
              <span className="truncate">{meta}</span>
              <span className="ml-auto">{direita}</span>
            </div>
          )}

          {(d.prazo || (capa?.membros.length ?? 0) > 0) && (
            <div className="mt-1.5 flex items-center gap-2">
              {d.prazo ? (
                <span
                  className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-muted-foreground"
                  title={`Entrega em ${new Date(d.prazo).toLocaleDateString("pt-BR")}`}
                >
                  <Clock className="size-3 shrink-0" aria-hidden />
                  <span className="tabular-nums">{prazoCurto(d.prazo)}</span>
                </span>
              ) : null}
              {(capa?.membros.length ?? 0) > 0 && (
                <span className="ml-auto flex items-center -space-x-2">
                  {capa!.membros.slice(0, 4).map((m) => (
                    <Avatar key={m.id} className="size-6 border border-card" title={m.nome}>
                      {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.nome} />}
                      <AvatarFallback className="bg-muted text-[9px]">
                        {iniciais(m.nome)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {capa!.membros.length > 4 && (
                    <span className="flex size-6 items-center justify-center rounded-full border border-card bg-muted text-[9px] font-medium text-muted-foreground">
                      +{capa!.membros.length - 4}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          {podeExcluir && (
            <button
              type="button"
              disabled={excluindo}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (
                  window.confirm(
                    "Tem certeza que deseja excluir esta demanda definitivamente?",
                  )
                ) {
                  onExcluir?.(d.id);
                }
              }}
              data-testid="cartao-excluir"
              title="Excluir definitivamente"
              aria-label="Excluir definitivamente"
              className={cn(
                "absolute bottom-2 right-2 z-10 rounded p-1",
                "bg-card/80 text-muted-foreground/70 transition-colors duration-200",
                "hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                "disabled:cursor-progress",
              )}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
