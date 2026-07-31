import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Blink } from "@/components/blink/Blink";
import { usePreferencia } from "@/hooks/usePreferencia";
import { useAuth } from "@/hooks/useAuth";
import { useContextoDeHeader } from "@/components/shell/HeaderContexto";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAcoesDemanda,
  useCriarCartao,
  useCapasDosCards,

  useDemandas,
  useExcluirProjeto,
  ehInbox,
  type Escopo,
} from "@/modules/demand-access";

import {
  agrupar,
  aplicarFila,
  buscar,
  contarFilas,
  resumir,
  sinaisUteis,
  tomDaEtapa,
  type FilaId,
  type LenteId,
} from "@/domain/demand";
import { ContextoDoProjeto } from "./components/ContextoDoProjeto";
import { ContextoDaInbox } from "./components/ContextoDaInbox";
import { BarraDeTrabalho, isFilaId, isLenteId } from "./components/BarraDeTrabalho";
import { ListaLente } from "./components/ListaLente";
import { BoardLente } from "./components/BoardLente";
import { GanttLente } from "./components/GanttLente";
import { Copiloto } from "./components/Copiloto";
import { CardDetailModal } from "./components/CardDetailModal";

const ETAPA_FORA_DO_FLUXO = "homologacao";

function normalizarEtapa(rotulo: string): string {
  return rotulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/**
 * FEATURE 027 — Workspace de Demandas.
 *
 * Este componente não sabe de onde vêm os dados. Ele monta um `Escopo`, chama
 * `useDemandas` e recebe `Demanda[]`. Abandonar `atividades_cards` amanhã é
 * editar `resolverFonte.ts` — este arquivo não muda uma linha.
 *
 * A tela é `fila × lente`:
 *   a FILA recorta quais demandas (`aplicarFila`)
 *   a LENTE decide como agrupar (`agrupar`)
 * As cinco visualizações não são cinco telas: são o mesmo conjunto com dois
 * parâmetros na URL.
 *
 * ONDA 2 — A MOLDURA
 * Havia cinco faixas horizontais antes do primeiro cartão, somando 266px. Duas
 * eram duplicatas (as abas do shell repetiam a sidebar; o breadcrumb dizia o
 * que o nome do projeto diz melhor) e uma era um cartaz permanente para um
 * texto que se lê uma vez. Agora são duas faixas de 40px:
 *
 *   header global  →  projeto ⌄ · progresso · sem dono · em risco   [⌘K] [✦]
 *   barra          →  filas · lentes · filtro
 *
 * O contexto do projeto sobe para o header por um slot (`useContextoDeHeader`),
 * não por portal de DOM: provider e slot vivem na mesma árvore React, então a
 * ordem de foco e a leitura de tela continuam corretas.
 */
export default function WorkspaceDemandas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const [cartaoAberto, setCartaoAberto] = useState<string | null>(null);
  /**
   * Fechar o painel precisa CONTINUAR fechado.
   *
   * Era `useState(true)`: a escolha morria ao trocar de projeto, e quem tinha
   * fechado reencontrava o painel aberto a cada navegação. Um controle que
   * esquece cobra o mesmo clique para sempre, e ensina a não personalizar
   * nada — porque personalizar não compensa.
   */
  const [copiloto, setCopiloto] = usePreferencia<boolean>(
    "workspace:copiloto",
    true,
    (v): v is boolean => typeof v === "boolean",
  );

  // A Inbox é a fila de quem ainda não foi classificado. Ela mora na mesma
  // rota dos projetos porque, para quem navega, é um destino irmão — mas o
  // escopo é global: não há projeto, e é exatamente esse o ponto.
  const naInbox = ehInbox(projetoId);

  const escopo: Escopo = useMemo(
    () => (projetoId && !naInbox ? { tipo: "projeto", projetoId } : { tipo: "global" }),
    [projetoId, naInbox],
  );

  /**
   * A ESCOLHA SOBREVIVE À NAVEGAÇÃO
   *
   * Lente e fila viviam só na URL. Ao abrir uma demanda e voltar, os
   * parâmetros sumiam e tudo caía no padrão — a pessoa escolhia "Sprint",
   * clicava num item, voltava e estava em "Board". Cada volta cobrava o mesmo
   * clique.
   *
   * A URL continua mandando quando existe, porque um link colado num Slack
   * precisa abrir a visão que quem colou estava vendo. Na ausência dela, vale
   * a última escolha da pessoa. As duas coisas convivem sem se contradizer:
   * link explícito ganha; hábito preenche o silêncio.
   */
  const [lenteSalva, guardarLente] = usePreferencia<LenteId>("demandas:lente", "board", isLenteId);
  const [filaSalva, guardarFila] = usePreferencia<FilaId>("demandas:fila", "todas", isFilaId);

  const lente: LenteId = isLenteId(params.get("lente")) ? (params.get("lente") as LenteId) : lenteSalva;
  const fila: FilaId = isFilaId(params.get("fila")) ? (params.get("fila") as FilaId) : filaSalva;

  const trocar = (chave: "lente" | "fila", valor: string) => {
    const proximo = new URLSearchParams(params);
    proximo.set(chave, valor);
    setParams(proximo, { replace: true });
    if (chave === "lente" && isLenteId(valor)) guardarLente(valor);
    if (chave === "fila" && isFilaId(valor)) guardarFila(valor);
  };

  const { demandas, projeto, etapas, capacidades, carregando, erro } = useDemandas(escopo);
  const acoes = useAcoesDemanda(escopo);
  // Criar e excluir só existem em escopo de projeto: é lá que há board e coluna.
  const cartoes = useCriarCartao(!naInbox && projetoId ? projetoId : null);
  const exclusao = useExcluirProjeto();


  const contagens = useMemo(() => contarFilas(demandas, user?.id ?? null), [demandas, user?.id]);
  const daFila = useMemo(() => aplicarFila(demandas, fila, user?.id ?? null), [demandas, fila, user?.id]);
  const visiveis = useMemo(() => buscar(daFila, busca), [daFila, busca]);
  const grupos = useMemo(
    () => agrupar(visiveis, lente).filter((grupo) => normalizarEtapa(grupo.rotulo) !== ETAPA_FORA_DO_FLUXO),
    [visiveis, lente],
  );
  const etapasVisiveis = useMemo(
    () => etapas.filter((etapa) => normalizarEtapa(etapa.rotulo) !== ETAPA_FORA_DO_FLUXO),
    [etapas],
  );
  const resumo = useMemo(() => resumir(daFila), [daFila]);

  // Dois filtros diferentes sobre o que desenhar:
  //   capacidades — a FONTE sabe o que e isso? (SLA nao existe num quadro)
  //   sinais      — isso separa uma demanda da outra AQUI? (se todas sao
  //                 "Media", a palavra repetida 36 vezes vira textura)
  const capacidadesVisiveis = useMemo(() => {
    const temPrazo = demandas.some((d) => d.prazo !== null);
    return { ...capacidades, prazo: capacidades.prazo && temPrazo, sla: capacidades.sla && temPrazo };
  }, [capacidades, demandas]);

  const sinais = useMemo(() => sinaisUteis(visiveis), [visiveis]);

  /**
   * A CAPA dos cartões — etiquetas e membros, em lote, só em escopo de
   * projeto. Na Inbox não existe etiqueta de quadro nem membro de cartão, e
   * buscar seria pagar uma consulta para receber nada.
   */
  const emProjeto = !naInbox && Boolean(projetoId);
  const idsVisiveis = useMemo(() => visiveis.map((d) => d.id), [visiveis]);
  const capas = useCapasDosCards(emProjeto ? idsVisiveis : [], emProjeto);

  /**
   * CONCLUIR NA CAPA — a bolinha do cartão.
   * A etapa de conclusão é descoberta pelo tom do nome (a mesma regra que
   * pinta a coluna), então mover não depende de um campo novo no banco. Sem
   * etapa de conclusão a ação não é oferecida.
   */
  const etapaConcluida = useMemo(
    () => etapasVisiveis.find((etapa) => tomDaEtapa(etapa.rotulo) === "concluido") ?? null,
    [etapasVisiveis],
  );
  const [concluindo, setConcluindo] = useState<Set<string>>(new Set());

  const concluirCartao = async (demandaId: string) => {
    const alvo = visiveis.find((d) => d.id === demandaId);
    if (!alvo || alvo.concluida) return;
    setConcluindo((s) => new Set(s).add(demandaId));
    try {
      if (etapaConcluida && alvo.status.id !== etapaConcluida.id) {
        await acoes.mover({ demandaId, statusId: etapaConcluida.id });
      }
      await acoes.concluir({ demandaId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir o cartão.");
    } finally {
      setConcluindo((s) => {
        const p = new Set(s);
        p.delete(demandaId);
        return p;
      });
    }
  };


  // O detalhe tem endereço próprio. Era a mudança estrutural que faltava para
  // uma demanda poder ser colada num Slack ou num e-mail.
  // Em escopo de PROJETO o cartão abre no modal (estilo Trello): o detalhe é
  // edição rápida, não uma página. Na Inbox continua indo para a rota própria,
  // porque lá a demanda é um ticket com fio de conversa e SLA.
  const abrir = (id: string) => {
    if (projetoId && !naInbox) {
      setCartaoAberto(id);
      return;
    }
    navigate(`/demandas/${id}`);
  };

  // A Inbox não tem projeto para descrever, mas precisa dizer onde a pessoa
  // está e quanto trabalho aguarda classificação — senão o header cai no
  // breadcrumb genérico e a tela parece a mesma dos projetos.
  const contextoInbox = (
    <>
      <ContextoDaInbox aguardando={resumo.abertas} />
      <button
        type="button"
        onClick={() => setCopiloto(!copiloto)}
        aria-label={copiloto ? "Ocultar o Blink" : "Mostrar o Blink"}
        className={cn(
          "ml-auto hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs xl:inline-flex",
          "transition-colors duration-fast ease-standard",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          copiloto ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Blink className="size-5" animado />
        {copiloto ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
      </button>
    </>
  );

  useContextoDeHeader(
    naInbox ? (
      contextoInbox
    ) : projeto ? (
      <>
        <ContextoDoProjeto
          projeto={projeto}
          resumo={resumo}
          onFila={(f) => trocar("fila", f)}
          excluindo={exclusao.salvando}
          onExcluir={async () => {
            try {
              await exclusao.excluir(projeto.id);
              toast.success("Quadro excluído.");
              navigate("/workspace/demandas");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Não foi possível excluir o quadro.");
            }
          }}
        />

        <button
          type="button"
          onClick={() => setCopiloto(!copiloto)}
          aria-label={copiloto ? "Ocultar o Blink" : "Mostrar o Blink"}
          className={cn(
            "ml-auto hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs xl:inline-flex",
            "transition-colors duration-fast ease-standard",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            copiloto ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Blink className="size-5" animado />
          {copiloto ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
        </button>
      </>
    ) : null,
    [
      naInbox,
      projeto?.id,
      projeto?.nome,
      projeto?.descricao,
      projeto?.capaUrl,
      projeto?.cor,
      resumo.abertas,
      resumo.total,
      resumo.concluidas,
      resumo.semResponsavel,
      resumo.emRisco,
      resumo.progresso,
      copiloto,
      params.toString(),
    ],
  );

  if (carregando && demandas.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Carregando demandas…</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12" role="alert">
        <p className="ds-body-strong text-destructive">Não foi possível carregar as demandas</p>
        <p className="ds-caption mt-1 text-muted-foreground">{erro.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BarraDeTrabalho
        fila={fila}
        onFila={(f) => trocar("fila", f)}
        contagens={contagens}
        lente={lente}
        onLente={(l) => trocar("lente", l)}
        busca={busca}
        onBusca={setBusca}
        total={daFila.length}
        filtradas={visiveis.length}
      />

      {/*
        A ALTURA PRECISA DESCER INTEIRA ATÉ O BOARD
        O board é a única lente que rola na horizontal, e ele só pode fazer
        isso se souber sua altura. Antes o container era `overflow-auto` e a
        grade tinha altura de conteúdo: o board terminava onde os cartões
        terminavam, a barra horizontal aparecia no meio da tela e sobrava um
        vazio enorme embaixo — e a página inteira ganhava uma segunda barra.

        Com o board, a rolagem vertical é da coluna, não da página. As outras
        lentes (lista, sprint, gantt) continuam rolando a página inteira,
        porque nelas o conteúdo é uma coluna só que cresce para baixo.
      */}
      <div className={cn("min-h-0 flex-1", lente === "board" ? "overflow-hidden" : "overflow-auto")}>
        <div
          className={cn(
            // Sem largura maxima e com respiro minimo: numa tela de 2560px o
            // antigo max-w-[1400px] deixava 1160px de cinza dos dois lados
            // enquanto o board rolava na horizontal.
            "grid w-full grid-cols-1 gap-0 px-3 py-3 md:px-4",
            copiloto && "xl:grid-cols-[minmax(0,1fr)_17rem] xl:gap-4",
            lente === "board" && "h-full min-h-0",
          )}
        >
          <div className={cn("min-w-0", lente === "board" && "h-full min-h-0")}>
            {lente === "board" ? (
              <BoardLente
                grupos={grupos}
                etapas={etapasVisiveis}
                capacidades={capacidadesVisiveis}
                sinais={sinais}
                onAbrir={abrir}
                onMover={({ demandaId, statusId }) => void acoes.mover({ demandaId, statusId })}
                podeMover={acoes.podeMover}
                onConcluir={emProjeto ? (id) => void concluirCartao(id) : undefined}
                concluindo={(id) => concluindo.has(id)}
                capas={capas}
                criandoCartao={cartoes.salvando}

                onCriarCartao={
                  !naInbox && projetoId
                    ? async ({ statusId, titulo }) => {
                        try {
                          await cartoes.criar({ colunaId: statusId, titulo });
                        } catch (e) {
                          toast.error(
                            e instanceof Error ? e.message : "Não foi possível criar o cartão.",
                          );
                        }
                      }
                    : undefined
                }

                vazio={{
                  titulo: busca ? "Nenhuma demanda encontrada" : "Nada nesta fila",
                  descricao: busca
                    ? "Tente outro termo ou limpe o filtro."
                    : fila === "minhas"
                      ? "Nada atribuído a você aqui. Veja “Todas” ou “Não atribuídas”."
                      : "Troque de fila para ver outro recorte.",
                }}
              />
            ) : lente === "gantt" ? (
              <GanttLente demandas={visiveis} onAbrir={abrir} />
            ) : (
              <ListaLente
                grupos={grupos}
                capacidades={capacidadesVisiveis}
                sinais={sinais}
                onAbrir={abrir}
                mostrarStatusNaLinha
                vazio={{
                  titulo: busca ? "Nenhuma demanda encontrada" : "Nada nesta fila",
                  descricao: busca ? "Tente outro termo ou limpe o filtro." : undefined,
                }}
              />
            )}
          </div>

          {/* No board o pai não rola mais, então o painel precisa rolar por
              conta própria — senão o conteúdo dele fica cortado sem saída. */}
          {copiloto && (
            <Copiloto
              demandas={daFila}
              resumo={resumo}
              onAbrir={abrir}
              className={cn(
                "hidden xl:block",
                lente === "board" && "h-full min-h-0 overflow-y-auto rolagem-discreta",
              )}
            />
          )}
        </div>
      </div>

      <CardDetailModal
        cardId={cartaoAberto}
        boardId={!naInbox && projetoId ? projetoId : null}
        onFechar={() => setCartaoAberto(null)}
      />
    </div>
  );
}
