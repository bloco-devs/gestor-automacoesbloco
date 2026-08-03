import { memo, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronRight, Plus } from "lucide-react";
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
            capa={capas?.get(d.id)}
            emProjeto={emProjeto}
          />
        ))}
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
   * ONDE O CARTÃO CAI — COLUNA E POSIÇÃO
   *
   * Duas formas de soltar, e cada uma diz uma coisa:
   *   sobre um cartão  → "quero ficar ACIMA deste"
   *   sobre a coluna   → "quero ficar no fim"
   *
   * A segunda é o espaço vazio abaixo da pilha, que é o gesto natural de quem
   * quer o último lugar. Antes só ela existia, e por isso todo cartão ia para
   * o fim independente de onde a pessoa soltasse.
   *
   * Mandamos a coluna INTEIRA na ordem final, não "o card vai para o índice
   * 2". Posição relativa cria empate — dois cartões com a mesma ordem ficam na
   * mão do desempate do banco, e o cartão solto no topo reaparece no meio.
   */
  const aoTerminar = (e: DragEndEvent) => {
    setArrastando(null);
    const alvoBruto = e.over?.id ? String(e.over.id) : null;
    const demandaId = String(e.active.id);
    if (!alvoBruto) return;
    const atual = porId.get(demandaId);
    if (!atual) return;

    const sobreCartao = alvoBruto.startsWith("alvo:");
    const idDoVizinho = sobreCartao ? alvoBruto.slice(5) : null;
    if (idDoVizinho === demandaId) return;

    // Soltar sobre um cartão herda a coluna DELE: a pessoa aponta para um
    // lugar, não para um contêiner.
    const grupoDestino = sobreCartao
      ? grupos.find((g) => g.itens.some((i) => i.id === idDoVizinho))
      : grupos.find((g) => g.id === alvoBruto);
    if (!grupoDestino) return;

    const semOArrastado = grupoDestino.itens.filter((i) => i.id !== demandaId).map((i) => i.id);
    const posicao = idDoVizinho ? semOArrastado.indexOf(idDoVizinho) : semOArrastado.length;
    const ordemDaColuna = [...semOArrastado];
    ordemDaColuna.splice(posicao < 0 ? semOArrastado.length : posicao, 0, demandaId);

    // Nada mudou: mesma coluna e mesma posição. Evita uma escrita à toa e o
    // piscar de lista que ela provoca.
    const eraIgual =
      atual.status.id === grupoDestino.id &&
      grupoDestino.itens.map((i) => i.id).join("|") === ordemDaColuna.join("|");
    if (eraIgual) return;

    onMover({ demandaId, statusId: grupoDestino.id, ordem: posicao, ordemDaColuna });
  };

  return (
    <DndContext sensors={sensores} onDragStart={aoIniciar} onDragEnd={aoTerminar} onDragCancel={() => setArrastando(null)}>
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
