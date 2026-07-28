import { memo, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { ChevronRight, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { EmptyPanel } from "@/design-system";
import {
  PRIORIDADE_ROTULO,
  RISCO_ROTULO,
  type Capacidades,
  type Demanda,
  type Grupo,
  type SinaisUteis,
} from "@/domain/demand";
import type { EtapaDaFonte } from "@/modules/demand-access";

/**
 * A lente de board.
 *
 * A HERANÇA DO TRELLO NÃO ESTAVA NO NOME — ESTAVA NO CSS
 * Trocar "quadro" por "projeto" não muda a sensação de estar num quadro. O que
 * a produzia eram três classes:
 *
 *   `surface-well`     dava à coluna um fundo cinza com sombra interna: a
 *                      "calha" onde os cartões repousam. Coluna com fundo é a
 *                      assinatura visual do Trello — em Linear, Height e GitHub
 *                      Projects a coluna não tem corpo, só um cabeçalho e uma
 *                      pilha.
 *   `surface-raised`   dava ao cartão sombra `elev-2` e `translateY(-2px)` no
 *                      hover: o cartão flutuava. Cartão que levita é papel
 *                      sobre uma mesa — a metáfora do Trello.
 *   `surface-dragging` girava o cartão 2,5° e ampliava 3% ao arrastar. É a
 *                      animação assinatura do Trello, e a única razão para ela
 *                      existir é ser divertida.
 *
 * As três saíram. O que ficou: coluna sem corpo, cartão com uma linha de 1px,
 * e arrasto que muda opacidade e contorno em vez de inclinar. A informação é a
 * mesma; o que sumiu foi o brinquedo.
 *
 * Escrita do zero sobre `Demanda`. Não importa nada de
 * `src/components/atividades/*` — nem `KanbanCard`, nem `Coluna`, nem
 * `BoardFilters`.
 *
 * Mover NÃO conhece tabela: chama `onMover`, que a camada de acesso traduz
 * para trocar coluna (quadro) ou trocar o enum de status (tickets).
 *
 * DOIS FILTROS SOBRE O QUE DESENHAR — os mesmos da Lista, pelo mesmo motivo
 *   `capacidades` — a fonte sabe o que é isso?
 *   `sinais`      — isso separa um cartão do outro aqui, agora?
 * Sem o segundo, o cartão imprimia a prioridade sempre: 36 cartões dizendo
 * "Média" gastavam uma linha cada para não informar nada. Quando não sobra
 * nada distintivo para dizer, o cartão perde o rodapé e fica com duas linhas.
 */

const COR_RISCO: Record<string, string> = {
  sla_estourado: "bg-destructive",
  atrasada: "bg-destructive",
  vence_hoje: "bg-warning",
  sla_atencao: "bg-warning",
  parada: "bg-warning/60",
  vence_em_breve: "bg-info",
};

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function Cartao({
  demanda: d,
  capacidades,
  sinais,
  onAbrir,
  arrastavel,
  sobreposicao,
}: {
  demanda: Demanda;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir?: (id: string) => void;
  arrastavel: boolean;
  sobreposicao?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: d.id,
    disabled: !arrastavel || sobreposicao,
  });
  const responsavel = d.responsaveis[0];

  const meta = [
    sinais.prioridade && d.prioridade ? PRIORIDADE_ROTULO[d.prioridade] : null,
    sinais.sistema ? (d.sistema?.nome ?? null) : null,
    sinais.referencia ? d.referencia : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
          {responsavel.avatarUrl && <AvatarImage src={responsavel.avatarUrl} alt={responsavel.nome} />}
          <AvatarFallback className="bg-muted text-[8px]">{iniciais(responsavel.nome)}</AvatarFallback>
        </Avatar>
      ) : (
        <span className="size-4 rounded-full border border-dashed border-border" title="Sem responsável" />
      )}
    </span>
  );

  return (
    <div
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
        "rounded-md border border-border/60 bg-card px-2 py-1.5 outline-none",
        "transition-colors duration-fast ease-standard hover:border-border hover:bg-muted/40",
        arrastavel ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        isDragging && !sobreposicao && "opacity-40",
        // Arrastando: contorno, não inclinação. O cartão continua sendo um
        // item de lista que mudou de lugar, não uma ficha de papel girando.
        sobreposicao && "border-primary/60 ring-1 ring-primary/30",
        d.concluida && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn("mt-0.5 h-8 w-[3px] shrink-0 rounded-full", d.risco ? COR_RISCO[d.risco] : "bg-transparent")}
          title={d.risco ? RISCO_ROTULO[d.risco] : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p
              className={cn(
                "line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-snug",
                d.concluida && "line-through",
              )}
            >
              {d.titulo}
            </p>
            {/* Sem rodapé, os sinais sobem para a linha do título em vez de
                abrirem uma segunda linha só para eles. */}
            {!meta && direita}
          </div>
          {meta && (
            <div className="ds-caption mt-1 flex items-center gap-1.5 text-muted-foreground">
              <span className="truncate">{meta}</span>
              <span className="ml-auto">{direita}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A coluna recolhida.
 *
 * Não é uma coluna escondida: continua sendo alvo de drop, continua mostrando
 * o rótulo e a contagem, e volta com um clique. O que ela deixa de gastar é
 * largura — que num board é o recurso escasso, porque a rolagem horizontal
 * esconde trabalho em curso atrás de trabalho terminado.
 */
function ColunaRecolhida({ grupo, onExpandir }: { grupo: Grupo; onExpandir: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: grupo.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onExpandir}
      aria-label={`Mostrar ${grupo.rotulo}, ${grupo.itens.length} demandas`}
      className={cn(
        "flex max-h-[calc(100vh-8rem)] min-h-[16rem] w-9 shrink-0 flex-col items-center gap-2 rounded-md border border-transparent py-3",
        "text-muted-foreground transition-colors duration-base ease-standard",
        "hover:bg-muted/40 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <ChevronRight className="size-3.5 shrink-0" aria-hidden />
      <span className="ds-caption tabular-nums font-medium text-foreground">{grupo.itens.length}</span>
      <span className="ds-caption whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
        {grupo.rotulo}
      </span>
    </button>
  );
}

function Coluna({
  grupo,
  capacidades,
  sinais,
  onAbrir,
  arrastavel,
  onRecolher,
}: {
  grupo: Grupo;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  arrastavel: boolean;
  onRecolher?: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: grupo.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex max-h-[calc(100vh-8rem)] min-h-[16rem] w-[15rem] shrink-0 flex-col rounded-md",
        "transition-colors duration-base ease-standard",
        // O alvo de drop se anuncia por fundo, não por anel: anel em volta de
        // uma coluna sem corpo desenharia uma caixa que não existe.
        isOver && "bg-primary/5",
      )}
      aria-label={`${grupo.rotulo}, ${grupo.itens.length} demandas`}
    >
      <header className="mb-2 flex items-center gap-2 border-b border-border/60 px-1 pb-1.5">
        <h2 className="truncate text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {grupo.rotulo}
        </h2>
        <span className="text-[12px] tabular-nums text-muted-foreground/70">{grupo.itens.length}</span>
        {onRecolher && (
          <button
            type="button"
            onClick={onRecolher}
            aria-label={`Recolher ${grupo.rotulo}`}
            className="ml-auto rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronRight className="size-3.5 rotate-180" aria-hidden />
          </button>
        )}
      </header>
      <div className="flex-1 space-y-1 overflow-y-auto px-0.5 pb-1">
        {grupo.itens.map((d) => (
          <Cartao
            key={d.id}
            demanda={d}
            capacidades={capacidades}
            sinais={sinais}
            onAbrir={onAbrir}
            arrastavel={arrastavel}
          />
        ))}
        {grupo.itens.length === 0 && (
          /* A palavra "Vazio" repetida em cada coluna vazia vira um coro de
             ruído — quatro rótulos dizendo o que a ausência de cartão já diz.
             A área tracejada informa a mesma coisa em silêncio, e ainda mostra
             onde se pode soltar. O texto só aparece quando há um cartão na
             mão, que é o único momento em que ele ajuda. */
          <div
            aria-hidden
            className={cn(
              "mx-0.5 mt-1 rounded-lg border border-dashed transition-colors duration-fast",
              isOver
                ? "border-primary/60 bg-primary/5 py-6"
                : "border-border/50 py-6",
            )}
          >
            {isOver && (
              <p className="ds-caption text-center text-muted-foreground">Soltar aqui</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

interface Props {
  grupos: Grupo[];
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  onMover: (params: { demandaId: string; statusId: string }) => void;
  podeMover: boolean;
  /**
   * Todas as etapas que a fonte conhece, na ordem da esteira.
   *
   * POR QUE ISSO PRECISOU EXISTIR
   * O board era montado só a partir dos grupos — e grupo só nasce quando há
   * demanda naquele status. Com uma demanda no backlog, aparecia UMA coluna,
   * e não havia para onde arrastar: o quadro virava uma lista de um item só.
   * Num projeto cheio o defeito ficava escondido, porque todas as colunas
   * tinham gente.
   *
   * Uma esteira precisa mostrar o caminho inteiro, inclusive os trechos
   * vazios — é o vazio que informa que ninguém está testando nada.
   */
  etapas?: EtapaDaFonte[];
}

function BoardLenteImpl({ grupos, capacidades, sinais, onAbrir, onMover, podeMover, etapas }: Props) {
  const [arrastando, setArrastando] = useState<Demanda | null>(null);
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const [jaVistas, setJaVistas] = useState<Set<string>>(new Set());
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /**
   * Colunas concluídas começam recolhidas — mas só na primeira vez que
   * aparecem. Depois disso a escolha é do usuário: recolher de novo o que ele
   * acabou de abrir seria a tela discordando dele a cada re-render.
   */
  useEffect(() => {
    const novas = grupos.filter((g) => g.concluido && !jaVistas.has(g.id)).map((g) => g.id);
    if (novas.length === 0) return;
    setRecolhidas((r) => new Set([...r, ...novas]));
    setJaVistas((v) => new Set([...v, ...novas]));
  }, [grupos, jaVistas]);

  const porId = useMemo(() => {
    const m = new Map<string, Demanda>();
    for (const g of grupos) for (const d of g.itens) m.set(d.id, d);
    return m;
  }, [grupos]);

  /**
   * A esteira completa: cada etapa vira coluna, com ou sem cartão dentro.
   * Sem `etapas` o comportamento é o de antes (só o que tem demanda), que é
   * o certo para quem chama sem conhecer a lista de status.
   */
  const colunas = useMemo<Grupo[]>(() => {
    if (!etapas || etapas.length === 0) return grupos;
    const porStatus = new Map(grupos.map((g) => [g.id, g]));
    const daEsteira = etapas.map(
      (e) => porStatus.get(e.id) ?? { id: e.id, rotulo: e.rotulo, itens: [] },
    );
    // Um status fora da esteira (dado antigo, migração) não pode sumir da
    // tela: some da esteira, some da conta, e ninguém procura o que não vê.
    const conhecidos = new Set(etapas.map((e) => e.id));
    const orfaos = grupos.filter((g) => !conhecidos.has(g.id));
    return [...daEsteira, ...orfaos];
  }, [etapas, grupos]);

  if (colunas.length === 0) {
    return <EmptyPanel title="Sem colunas" description="Nenhuma demanda corresponde a esta fila." />;
  }

  const alternar = (id: string) =>
    setRecolhidas((r) => {
      const p = new Set(r);
      if (p.has(id)) p.delete(id);
      else p.add(id);
      return p;
    });

  const aoIniciar = (e: DragStartEvent) => setArrastando(porId.get(String(e.active.id)) ?? null);

  const aoTerminar = (e: DragEndEvent) => {
    setArrastando(null);
    const destino = e.over?.id ? String(e.over.id) : null;
    const demandaId = String(e.active.id);
    if (!destino) return;
    const atual = porId.get(demandaId);
    if (!atual || atual.status.id === destino) return;
    onMover({ demandaId, statusId: destino });
  };

  return (
    <DndContext sensors={sensores} onDragStart={aoIniciar} onDragEnd={aoTerminar} onDragCancel={() => setArrastando(null)}>
      <div className="rolagem-discreta flex gap-4 overflow-x-auto pb-2">
        {colunas.map((g) =>
          recolhidas.has(g.id) ? (
            <ColunaRecolhida key={g.id} grupo={g} onExpandir={() => alternar(g.id)} />
          ) : (
            <Coluna
              key={g.id}
              grupo={g}
              capacidades={capacidades}
              sinais={sinais}
              onAbrir={onAbrir}
              arrastavel={podeMover}
              onRecolher={g.concluido ? () => alternar(g.id) : undefined}
            />
          ),
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {arrastando ? (
          <div className="w-[15rem]">
            <Cartao demanda={arrastando} capacidades={capacidades} sinais={sinais} arrastavel sobreposicao />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export const BoardLente = memo(BoardLenteImpl);
