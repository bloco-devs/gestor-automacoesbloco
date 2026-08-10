import { memo, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronRight, Plus } from "lucide-react";
import { inserirNaLista, reordenarLista } from "../ordenacao";
import { cn } from "@/lib/utils";
import { EmptyPanel } from "@/design-system";
import {
  type Capacidades,
  type Demanda,
  type Grupo,
  type SinaisUteis,
  tomDaEtapa,
} from "@/domain/demand";
import type { CapasResolvidas, EtapaDaFonte } from "@/modules/demand-access";
import { Cartao, PALETA } from "./KanbanCard";
import { KanbanCardOverlay } from "./KanbanCardOverlay";

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
 *
 * MODULARIDADE
 * O `Cartao` e a `PALETA` vivem em `KanbanCard.tsx`; o `<DragOverlay>` com a
 * física Trello vive em `KanbanCardOverlay.tsx`. A divisão existe para evitar
 * dependência circular: BoardLente ← KanbanCardOverlay ← KanbanCard ✓.
 */

// ─── Coluna recolhida ─────────────────────────────────────────────────────────

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
  // Recolher esconde largura, não significado. Sem o tom aqui, a coluna
  // recolhida viraria a única do board sem estado legível.
  const tinta = PALETA[tomDaEtapa(grupo.rotulo)];
  const IconeDaEtapa = tinta.icone;

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
      <span
        aria-hidden
        className={cn("flex size-5 shrink-0 items-center justify-center rounded-[6px]", tinta.fundo)}
      >
        <IconeDaEtapa className={cn("size-3", tinta.texto)} />
      </span>
      <span className="ds-caption tabular-nums font-medium text-foreground">{grupo.itens.length}</span>
      <span className="ds-caption whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
        {grupo.rotulo}
      </span>
    </button>
  );
}

// ─── Compor cartão inline ─────────────────────────────────────────────────────

/**
 * Compor cartão sem sair da coluna.
 *
 * Dentro de um projeto, criar item é a ação mais repetida do dia. O botão vira
 * campo, Enter grava, Esc desiste, e o campo continua aberto para o próximo —
 * quem está esvaziando a cabeça digita cinco itens seguidos, não um.
 *
 * Só existe onde há coluna de banco para receber: a tela passa o callback
 * apenas em escopo de projeto.
 */
function ComporCartao({
  onCriar,
  salvando,
}: {
  onCriar: (titulo: string) => void | Promise<void>;
  salvando?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");

  async function gravar() {
    const limpo = titulo.trim();
    if (!limpo || salvando) return;
    await onCriar(limpo);
    setTitulo("");
  }

  if (!aberto) {
    return (
      <button
        type="button"
        data-testid="compor-cartao-abrir"
        onClick={() => setAberto(true)}
        className="mx-0.5 mt-1 flex w-[calc(100%-0.25rem)] items-center gap-1.5 rounded-lg px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:bg-muted"
      >
        <Plus className="size-3.5 shrink-0" aria-hidden />
        Adicionar um cartão
      </button>
    );
  }

  return (
    <div className="mx-0.5 mt-1 space-y-1.5">
      <textarea
        autoFocus
        rows={2}
        value={titulo}
        disabled={salvando}
        data-testid="compor-cartao-titulo"
        placeholder="Título do cartão"
        aria-label="Título do novo cartão"
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void gravar();
          }
          if (e.key === "Escape") {
            setTitulo("");
            setAberto(false);
          }
        }}
        className="w-full resize-none rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="compor-cartao-salvar"
          disabled={!titulo.trim() || salvando}
          onClick={() => void gravar()}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTitulo("");
            setAberto(false);
          }}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Coluna ───────────────────────────────────────────────────────────────────

function Coluna({
  grupo,
  capacidades,
  sinais,
  onAbrir,
  arrastavel,
  onRecolher,
  onAssumir,
  assumindo,
  onConcluir,
  concluindo,
  onExcluir,
  excluindo,
  onCriarCartao,
  criandoCartao,
  capas,
  emProjeto,
}: {
  grupo: Grupo;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  arrastavel: boolean;
  onRecolher?: () => void;
  onAssumir?: (id: string) => void;
  assumindo?: (id: string) => boolean;
  onConcluir?: (id: string) => void;
  concluindo?: (id: string) => boolean;
  onExcluir?: (id: string) => void;
  excluindo?: (id: string) => boolean;
  onCriarCartao?: (titulo: string) => void | Promise<void>;
  criandoCartao?: boolean;
  capas?: CapasResolvidas;
  emProjeto?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: grupo.id });
  const tinta = PALETA[tomDaEtapa(grupo.rotulo)];
  const IconeDaEtapa = tinta.icone;

  return (
    <section
      data-testid="coluna"
      data-coluna={grupo.rotulo}
      ref={setNodeRef}
      className={cn(
        // COLUNA ELÁSTICA — cresce para dividir o espaço disponível.
        // `basis-60` é o piso: quando as colunas não couberem elas param de
        // encolher e o board rola na horizontal, que é o comportamento certo.
        "flex h-full min-h-[16rem] flex-1 basis-60 flex-col rounded-lg",
        "min-w-[15rem] max-w-[22rem]",
        "transition-colors duration-base ease-standard",
        // O alvo de drop se anuncia por fundo, não por anel: anel em volta de
        // uma coluna sem corpo desenharia uma caixa que não existe.
        isOver && "bg-primary/5",
      )}
      aria-label={`${grupo.rotulo}, ${grupo.itens.length} demandas`}
      data-total={grupo.itens.length}
    >
      {/* A contagem vira pastilha em vez de número solto. */}
      <header className="mb-2 px-1.5">
        <div className="flex items-center gap-2 pb-2">
          <span
            aria-hidden
            className={cn("flex size-5 shrink-0 items-center justify-center rounded-[6px]", tinta.fundo)}
          >
            <IconeDaEtapa className={cn("size-3", tinta.texto)} />
          </span>
          <h2 className={cn("truncate text-[12px] font-semibold uppercase tracking-wide", tinta.texto)}>
            {grupo.rotulo}
          </h2>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
              tinta.pastilha,
            )}
          >
            {grupo.itens.length}
          </span>
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
        </div>
        {/* A régua substitui a borda cinza de 1px. Ela faz o mesmo trabalho de
            separar cabeçalho de conteúdo, e de quebra carrega o tom. */}
        <div aria-hidden className={cn("h-0.5 w-full rounded-full", tinta.regua)} />
      </header>
      <div className="rolagem-discreta flex-1 space-y-2 overflow-y-auto px-1 pb-2">
        {/* O contexto sortable é POR COLUNA: é ele que faz os vizinhos abrirem
            espaço na vertical enquanto o cartão está na mão. */}
        <SortableContext
          items={grupo.itens.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {grupo.itens.map((d) => (
            <Cartao
              key={d.id}
              demanda={d}
              capacidades={capacidades}
              sinais={sinais}
              onAbrir={onAbrir}
              arrastavel={arrastavel}
              onAssumir={onAssumir}
              assumindo={assumindo?.(d.id)}
              onConcluir={onConcluir}
              concluindo={concluindo?.(d.id)}
              onExcluir={onExcluir}
              excluindo={excluindo?.(d.id)}
              tom={tomDaEtapa(grupo.rotulo)}
              colunaRotulo={grupo.rotulo}
              colunaId={grupo.id}
              capa={capas?.get(d.id)}
              emProjeto={emProjeto}
            />
          ))}
        </SortableContext>

        {grupo.itens.length === 0 && (
          /* A área tracejada informa onde se pode soltar em silêncio.
             O texto só aparece quando há um cartão na mão. */
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
        {onCriarCartao ? (
          <ComporCartao onCriar={onCriarCartao} salvando={criandoCartao} />
        ) : null}
      </div>
    </section>
  );
}

// ─── Props do board ───────────────────────────────────────────────────────────

interface Props {
  grupos: Grupo[];
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  onMover: (params: {
    demandaId: string;
    statusId: string;
    /** Índice de destino dentro da coluna. */
    ordem?: number;
    /** A coluna de destino inteira, na ordem final. Ver `AcoesDemanda.mover`. */
    ordemDaColuna?: string[];
  }) => void;
  podeMover: boolean;
  /** Mesma forma que a `ListaLente` usa — as duas lentes falam a mesma língua. */
  vazio?: { titulo: string; descricao?: string };
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
  onAssumir?: (id: string) => void;
  assumindo?: (id: string) => boolean;
  onConcluir?: (id: string) => void;
  concluindo?: (id: string) => boolean;
  onExcluir?: (id: string) => void;
  excluindo?: (id: string) => boolean;
  /**
   * Criar cartão direto na coluna. Sem isto o "+ Adicionar um cartão" não
   * aparece — quem sabe se existe coluna de banco para receber é a tela, e na
   * Inbox não existe.
   */
  onCriarCartao?: (params: { statusId: string; titulo: string }) => void | Promise<void>;
  criandoCartao?: boolean;
  /**
   * A capa dos cartões (etiquetas e membros), por id de demanda. Quem carrega
   * é a tela — o board apenas desenha o que recebe.
   */
  capas?: CapasResolvidas;
  /**
   * Quadro de projeto: esconde os sinais que só fazem sentido no Helpdesk
   * (código de rastreio, círculo tracejado de "sem responsável").
   */
  emProjeto?: boolean;
}

// ─── BoardLenteImpl ───────────────────────────────────────────────────────────

function BoardLenteImpl({
  grupos,
  capacidades,
  sinais,
  onAbrir,
  onMover,
  podeMover,
  etapas,
  vazio,
  onAssumir,
  assumindo,
  onConcluir,
  concluindo,
  onExcluir,
  excluindo,
  onCriarCartao,
  criandoCartao,
  capas,
  emProjeto,
}: Props) {
  const [arrastando, setArrastando] = useState<Demanda | null>(null);
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const [jaVistas, setJaVistas] = useState<Set<string>>(new Set());
  /**
   * `distance: 6` é o limiar que separa clique de arrasto: abrir o cartão é a
   * ação mais frequente, então o gesto de pegar precisa ser deliberado.
   * O teclado usa o `coordinateGetter` do sortable para navegar a lista na
   * vertical — sem ele, arrastar por teclado não reordena.
   */
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
   * A ORDEM OTIMISTA — POR QUE ELA PRECISA EXISTIR
   *
   * `grupos` vem do servidor. Ao soltar um cartão, a gravação leva alguns
   * milissegundos e o próximo render ainda traz a ordem antiga: o cartão volta
   * ao lugar de origem e só depois pula para o novo — o efeito elástico.
   *
   * Guardar aqui a sequência final da coluna mexida faz a tela contar a
   * verdade imediatamente. A entrada é descartada assim que o servidor chega
   * com essa mesma sequência (ou com outra, se a gravação falhou — nesse caso
   * a verdade do servidor vence, que é o comportamento correto).
   */
  const [ordemLocal, setOrdemLocal] = useState<Map<string, string[]>>(new Map());
  /**
   * A COLUNA OTIMISTA — o mesmo princípio, para o movimento HORIZONTAL.
   *
   * `ordemLocal` só conserta a sequência dentro de uma coluna. Ao soltar numa
   * coluna diferente, o próximo render ainda traz o cartão no grupo antigo:
   * ele volta para a origem e só pula para o destino quando o servidor chega.
   *
   * Este mapa (demandaId -> colunaId de destino) faz a tela reatribuir o
   * cartão na hora. A entrada é descartada quando o servidor concorda — ou
   * quando ele discorda, e aí a verdade dele vence.
   */
  const [colunaLocal, setColunaLocal] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setOrdemLocal((atual) => {
      if (atual.size === 0) return atual;
      const proximo = new Map(atual);
      let mudou = false;
      for (const [colunaId, ordem] of atual) {
        const grupo = grupos.find((g) => g.id === colunaId);
        // Coluna que não existe mais, ou já chegou na ordem pedida: solta.
        const idsDoServidor = grupo?.itens.map((d) => d.id) ?? [];
        const mesmoConjunto =
          idsDoServidor.length === ordem.length && idsDoServidor.every((id) => ordem.includes(id));
        if (!grupo || (mesmoConjunto && idsDoServidor.join("\u0000") === ordem.join("\u0000"))) {
          proximo.delete(colunaId);
          mudou = true;
        }
      }
      return mudou ? proximo : atual;
    });
    setColunaLocal((atual) => {
      if (atual.size === 0) return atual;
      const proximo = new Map(atual);
      let mudou = false;
      for (const [demandaId, colunaId] of atual) {
        const grupoDoServidor = grupos.find((g) => g.itens.some((d) => d.id === demandaId));
        // Chegou onde pedimos, ou o cartão/coluna sumiu: solta a expectativa.
        if (!grupoDoServidor || grupoDoServidor.id === colunaId) {
          proximo.delete(demandaId);
          mudou = true;
        }
      }
      return mudou ? proximo : atual;
    });
  }, [grupos]);


  /**
   * A esteira completa: cada etapa vira coluna, com ou sem cartão dentro.
   * Sem `etapas` o comportamento é o de antes (só o que tem demanda), que é
   * o certo para quem chama sem conhecer a lista de status.
   */
  const colunas = useMemo<Grupo[]>(() => {
    const base = !etapas || etapas.length === 0 ? grupos : null;
    const montadas =
      base ??
      (() => {
        const porStatus = new Map(grupos.map((g) => [g.id, g]));
        const daEsteira = etapas!.map(
          (e) => porStatus.get(e.id) ?? { id: e.id, rotulo: e.rotulo, itens: [] },
        );
        // Um status fora da esteira (dado antigo, migração) não pode sumir da
        // tela: some da esteira, some da conta, e ninguém procura o que não vê.
        const conhecidos = new Set(etapas!.map((e) => e.id));
        const orfaos = grupos.filter((g) => !conhecidos.has(g.id));
        return [...daEsteira, ...orfaos];
      })();

    // 1) REATRIBUIÇÃO: o cartão movido já aparece na coluna de destino.
    const comColuna =
      colunaLocal.size === 0
        ? montadas
        : (() => {
            const movidos = new Map<string, Demanda[]>();
            const semOsMovidos = montadas.map((g) => {
              const ficam: Demanda[] = [];
              for (const d of g.itens) {
                const destino = colunaLocal.get(d.id);
                if (destino && destino !== g.id) {
                  const fila = movidos.get(destino) ?? [];
                  fila.push(d);
                  movidos.set(destino, fila);
                } else {
                  ficam.push(d);
                }
              }
              return ficam.length === g.itens.length ? g : { ...g, itens: ficam };
            });
            if (movidos.size === 0) return semOsMovidos;
            return semOsMovidos.map((g) => {
              const entrando = movidos.get(g.id);
              return entrando ? { ...g, itens: [...g.itens, ...entrando] } : g;
            });
          })();

    // 2) ORDEM: a sequência final de cada coluna mexida.
    if (ordemLocal.size === 0) return comColuna;
    return comColuna.map((g) => {
      const ordem = ordemLocal.get(g.id);
      if (!ordem) return g;
      const porIdDaColuna = new Map(g.itens.map((d) => [d.id, d]));
      const ordenados = ordem.flatMap((id) => {
        const d = porIdDaColuna.get(id);
        if (d) porIdDaColuna.delete(id);
        return d ? [d] : [];
      });
      // Quem chegou depois do arrasto (cartão novo) entra no fim, nunca sai.
      return { ...g, itens: [...ordenados, ...porIdDaColuna.values()] };
    });

  }, [etapas, grupos, ordemLocal, colunaLocal]);



  /**
   * COLUNAS SÃO ESTRUTURA, NÃO CONTEÚDO
   *
   * Um quadro recém-criado nasce com colunas e zero cartões: é exatamente o
   * momento em que a pessoa precisa ver as colunas para arrastar algo para
   * dentro. Por isso o vazio só aparece quando a fonte não devolveu coluna
   * nenhuma; havendo colunas, elas são desenhadas mesmo todas vazias.
   */
  if (colunas.length === 0) {
    return (
      <EmptyPanel
        title={vazio?.titulo ?? "Nada nesta fila"}
        description={vazio?.descricao ?? "Troque de fila para ver outro recorte."}
      />
    );
  }

  const alternar = (id: string) =>
    setRecolhidas((r) => {
      const p = new Set(r);
      if (p.has(id)) p.delete(id);
      else p.add(id);
      return p;
    });

  const aoIniciar = (e: DragStartEvent) => setArrastando(porId.get(String(e.active.id)) ?? null);

  /**
   * ONDE O CARTÃO CAI — COLUNA **E** POSIÇÃO.
   *
   * O alvo do drop pode ser duas coisas diferentes, e a distinção é toda a
   * lógica daqui:
   *
   *   • uma COLUNA (o `useDroppable` da `<section>`) → soltou no vazio, vai
   *     para o fim daquela coluna;
   *   • um CARTÃO (o `useSortable` de cada cartão) → soltou sobre alguém, entra
   *     na posição dele.
   *
   * Nos dois casos mandamos a coluna de destino INTEIRA, na ordem final
   * (`ordemDaColuna`). Mandar só o cartão movido com `ordem: 0` deixaria dois
   * cartões disputando a mesma posição e o desempate seria do banco — a fila
   * mudaria de aparência a cada recarga.
   *
   * O cálculo em si mora em `../ordenacao`, puro e testado.
   */
  const aoTerminar = (e: DragEndEvent) => {
    setArrastando(null);
    const destino = e.over?.id ? String(e.over.id) : null;
    const demandaId = String(e.active.id);
    if (!destino || destino === demandaId) return;
    const atual = porId.get(demandaId);
    if (!atual) return;

    const colunaDoAlvo = colunas.find((c) => c.id === destino);
    // Soltou sobre um cartão: a coluna dele vem no `data` do sortable, com
    // busca como rede de segurança.
    const dadosDoAlvo = e.over?.data.current as { colunaId?: string } | undefined;
    const colunaDeDestino =
      colunaDoAlvo ??
      colunas.find(
        (c) => c.id === dadosDoAlvo?.colunaId || c.itens.some((d) => d.id === destino),
      );
    if (!colunaDeDestino) return;

    const idsDestino = colunaDeDestino.itens.map((d) => d.id);
    // A coluna de ORIGEM é a que contém o cartão nesta tela — não
    // `atual.status.id`. Colunas fundidas (a de conclusão soma duas fontes)
    // têm id de uma das metades, e comparar pelo status faria um arrasto
    // dentro da própria coluna parecer troca de coluna.
    const colunaDeOrigem = colunas.find((c) => c.itens.some((d) => d.id === demandaId));
    const mesmaColuna = (colunaDeOrigem?.id ?? atual.status.id) === colunaDeDestino.id;

    // Reordenar dentro da própria coluna.
    if (mesmaColuna) {
      // Soltou no corpo da coluna (não sobre um cartão): vai para o fim.
      const ordemFinal = colunaDoAlvo
        ? inserirNaLista(idsDestino, demandaId, null)
        : reordenarLista(idsDestino, demandaId, destino);
      if (ordemFinal.join("\u0000") === idsDestino.join("\u0000")) return;
      // ATUALIZAÇÃO OTIMISTA: a tela assume a nova sequência agora, antes da
      // gravação. Sem isto o cartão volta ao lugar de origem e pula depois.
      setOrdemLocal((atualMapa) => new Map(atualMapa).set(colunaDeDestino.id, ordemFinal));
      onMover({ demandaId, statusId: colunaDeDestino.id, ordemDaColuna: ordemFinal });
      return;
    }


    // Trocar de coluna, agora já com a posição de inserção correta.
    const ordemFinal = inserirNaLista(idsDestino, demandaId, colunaDoAlvo ? null : destino);
    // ATUALIZAÇÃO OTIMISTA INTER-COLUNAS: o cartão sai da origem e entra no
    // destino na posição exata, antes da gravação. Sem isto ele voltaria para
    // a coluna de origem até o servidor responder (o snap-back).
    setColunaLocal((mapa) => new Map(mapa).set(demandaId, colunaDeDestino.id));
    setOrdemLocal((mapa) => {
      const proximo = new Map(mapa).set(colunaDeDestino.id, ordemFinal);
      if (colunaDeOrigem) {
        proximo.set(
          colunaDeOrigem.id,
          colunaDeOrigem.itens.map((d) => d.id).filter((id) => id !== demandaId),
        );
      }
      return proximo;
    });
    onMover({
      demandaId,
      statusId: colunaDeDestino.id,
      ordem: ordemFinal.indexOf(demandaId),
      ordemDaColuna: ordemFinal,
    });
  };



  return (
    <DndContext
      sensors={sensores}
      // `closestCorners` é a colisão recomendada para listas verticais: ela
      // acerta a lacuna entre dois cartões, que é onde a pessoa mira.
      collisionDetection={closestCorners}
      onDragStart={aoIniciar}
      onDragEnd={aoTerminar}
      onDragCancel={() => setArrastando(null)}
    >
      {/* `contents` deixa o filho herdar a altura do avô sem criar um nível de
          caixa no meio — o DndContext não renderiza DOM, mas este wrapper sim. */}
      <div className="rolagem-discreta flex h-full min-h-0 items-stretch gap-4 overflow-x-auto overflow-y-hidden pb-2">
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
              onAssumir={onAssumir}
              assumindo={assumindo}
              onConcluir={onConcluir}
              concluindo={concluindo}
              onExcluir={onExcluir}
              excluindo={excluindo}
              onCriarCartao={
                onCriarCartao
                  ? (titulo) => onCriarCartao({ statusId: g.id, titulo })
                  : undefined
              }
              criandoCartao={criandoCartao}
              capas={capas}
              emProjeto={emProjeto}
            />
          ),
        )}
      </div>

      {/* O DragOverlay com a física Trello vive em KanbanCardOverlay para evitar
          dependência circular (BoardLente ← KanbanCardOverlay ← KanbanCard). */}
      <KanbanCardOverlay
        arrastando={arrastando}
        capacidades={capacidades}
        sinais={sinais}
        grupos={grupos}
        emProjeto={emProjeto}
        capas={capas}
      />
    </DndContext>
  );
}

export const BoardLente = memo(BoardLenteImpl);
