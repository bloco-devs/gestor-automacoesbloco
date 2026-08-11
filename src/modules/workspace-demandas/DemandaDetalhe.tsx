import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferencia } from "@/hooks/usePreferencia";
import { useAuth } from "@/hooks/useAuth";
import { useContextoDeHeader } from "@/components/shell/HeaderContexto";
import { cn } from "@/lib/utils";
import {
  useAcoesDemanda,
  useAssumirDemanda,
  useAnexos,
  useChecklist,
  useConhecimento,
  usePublicarArtigo,
  useDemanda,
  useFioDaDemanda,
  type Escopo,
} from "@/modules/demand-access";
import { rascunhoDeDemanda } from "@/domain/knowledge";
import {
  PRIORIDADE_ROTULO,
  RISCO_ROTULO,
  TIPO_ROTULO,
  acoesSugeridas,
  montarBriefing,
  montarProgressao,
  montarFio,
  type AcaoSugerida,
  type Pessoa,
} from "@/domain/demand";
import { Contexto } from "./demanda/Contexto";
import { Secao } from "./demanda/Secao";
import { Blink } from "@/components/blink/Blink";
import { Progresso } from "./demanda/Progresso";
import { Checklist } from "./demanda/Checklist";
import { Anexos } from "./demanda/Anexos";
import { RascunhoDeArtigo } from "./demanda/RascunhoDeArtigo";
import { Fio } from "./demanda/Fio";
import { CopilotoDaDemanda } from "./demanda/CopilotoDaDemanda";

const ETAPA_FORA_DO_FLUXO = "homologacao";

function normalizarEtapa(rotulo: string): string {
  return rotulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/**
 * `/demandas/:id` — a página mais importante do sistema.
 *
 * O QUE ELA É
 * O ponto único de colaboração entre solicitante, desenvolvedor, gestor e IA.
 * Tudo relacionado a uma demanda acontece aqui: ninguém precisa navegar entre
 * páginas para entender o andamento.
 *
 * POR QUE PÁGINA, E NUNCA MODAL OU DRAWER
 * O link de um chamado é a unidade de comunicação de uma empresa — ele é colado
 * em conversa, encaminhado por e-mail, aberto em nova aba. Modal não tem URL,
 * drawer não sobrevive a um refresh, e nenhum dos dois volta com o botão de
 * voltar. Um Help Desk cujo ticket não tem endereço não é um Help Desk.
 *
 * AS TRÊS COLUNAS
 *   ESQUERDA   o retrato: quem, o quê, quando, com quem
 *   CENTRO     o filme: a conversa, com a IA como mais um participante
 *   DIREITA    a conclusão: risco, de quem é a vez, parecidas, próximo passo
 *
 * O centro é o mais largo de propósito. Num sistema de chamado, a coluna que
 * cresce é aquela em que se trabalha — e trabalhar aqui é ler e responder.
 *
 * O QUE ACONTECE QUANDO A FONTE NÃO TEM CONVERSA
 * Uma demanda vinda de um projeto importado não tem comentários nem auditoria:
 * a tabela não guarda isso. `capacidades` diz, e a coluna do centro explica em
 * uma frase em vez de mostrar um vazio que se leria como "ninguém falou".
 */
export default function DemandaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const projetoId = params.get("projeto");

  const escopo: Escopo = useMemo(
    () => (projetoId ? { tipo: "projeto", projetoId } : { tipo: "global" }),
    [projetoId],
  );

  const { demanda, demandas, etapas, capacidades, carregando, erro } = useDemanda(escopo, id ?? null);

  /**
   * Os autores dos eventos vêm como id. Quem sabe traduzir id em pessoa é a
   * lista que já foi carregada — evita uma consulta a mais e garante que o
   * nome no fio é o mesmo nome da lista.
   */
  const pessoas = useMemo(() => {
    const m = new Map<string, Pessoa>();
    for (const d of demandas) {
      for (const p of d.responsaveis) m.set(p.id, p);
      if (d.autor) m.set(d.autor.id, d.autor);
    }
    return m;
  }, [demandas]);

  // Quem abriu não vê nota interna. É a única regra de visibilidade do fio, e
  // ela mora aqui porque é permissão, não domínio.
  const daEquipe = user?.role === "developer" || !!user?.isAdministrador;

  const anexos = useAnexos(id ?? null, capacidades.comentarios);

  const fio = useFioDaDemanda(id ?? null, {
    habilitado: capacidades.comentarios,
    pessoas,
    internasVisiveis: daEquipe,
    anexos: anexos.anexos,
    semResponsavel: (demanda?.responsaveis.length ?? 0) === 0,
  });


  const eventos = useMemo(() => montarFio(fio.eventos, daEquipe), [fio.eventos, daEquipe]);
  const acoesDemanda = useAcoesDemanda(escopo);
  /**
   * A MESMA escrita dos cartões do quadro — nada de mutação nova.
   * `desassumir` já decide a fonte pelo `projetoId` e limpa o cache na hora,
   * então o avatar sai da tela antes da resposta do Supabase.
   */
  const { desassumir, assumindo } = useAssumirDemanda();
  const checklist = useChecklist(id ?? null, capacidades.progresso && capacidades.comentarios);
  const conhecimento = useConhecimento(demanda ?? null, demandas, !!demanda);
  const { publicar } = usePublicarArtigo();
  const [rascunhoAberto, setRascunhoAberto] = useState(false);

  /**
   * O painel recolhe, e a escolha é lembrada.
   *
   * Aberto por padrão porque é onde mora a recomendação — esconder isso do
   * primeiro segundo tiraria justamente o que puxa a ação. Mas quem está
   * conduzindo uma conversa longa quer a largura toda, e não deveria pagar
   * essa escolha de novo a cada demanda que abre.
   */
  const [painel, setPainel] = usePreferencia<boolean>(
    "demanda:painel",
    true,
    (v): v is boolean => typeof v === "boolean",
  );

  /**
   * O rascunho de artigo, montado da demanda resolvida.
   *
   * Sem nenhuma chamada de IA: problema vem da descrição, sintomas das
   * primeiras falas de quem abriu, solução das últimas falas da equipe, e o
   * "como verificar" do checklist. É rearranjo de texto que já existe.
   */
  const rascunho = useMemo(
    () =>
      demanda
        ? rascunhoDeDemanda(
            demanda,
            eventos,
            checklist.itens.filter((i) => i.feito).map((i) => i.texto),
            demanda.autor?.id ?? null,
          )
        : null,
    [demanda, eventos, checklist.itens],
  );

  const progressao = useMemo(
    () =>
      demanda
        ? montarProgressao(
            demanda,
            eventos,
            etapas.filter((etapa) => normalizarEtapa(etapa.rotulo) !== ETAPA_FORA_DO_FLUXO),
          )
        : null,
    [demanda, eventos, etapas],
  );

  const briefing = useMemo(
    () =>
      demanda
        ? montarBriefing(
            demanda,
            eventos,
            capacidades,
            demanda.autor?.id ?? null,
            anexos.anexos,
            conhecimento.relacionados,
          )
        : { oQuePedem: "", anexos: null, jaExiste: null, jaTentado: [], travando: [], porOndeComecar: "" },
    [demanda, eventos, capacidades, anexos.anexos, conhecimento.relacionados],
  );

  /**
   * As sugestões só aparecem para quem pode agir sobre elas. Oferecer "assumir"
   * a quem não tem permissão é prometer um botão que vai falhar — e o preço de
   * uma sugestão que falha é a pessoa parar de acreditar nas outras.
   */
  const acoes = useMemo<AcaoSugerida[]>(() => {
    if (!demanda || !daEquipe) return [];
    // O checklist real tem precedência sobre o progresso que veio da fonte: é
    // ele que o desenvolvedor marca, e é dele que "Concluir" depende.
    const comProgresso = {
      ...demanda,
      progresso: checklist.total > 0 ? { feitos: checklist.feitos, total: checklist.total, percentual: 0 } : demanda.progresso,
    };
    return acoesSugeridas(comProgresso, eventos, demanda.autor?.id ?? null);
  }, [demanda, eventos, daEquipe, checklist.feitos, checklist.total]);

  /**
   * Executar a sugestão. Cada caso cai numa ação que já existia — nenhuma
   * capacidade nova foi criada aqui, só o atalho para ela.
   *
   * `cobrar` grava a mensagem pronta; `responder` apenas leva o foco para o
   * campo, porque escrever a resposta por alguém é o tipo de automação que
   * quem recebe percebe na primeira linha e passa a ignorar.
   */
  /**
   * Toda ação daqui escreve no banco, e escrita falha — por permissão, por
   * rede, por regra. Antes, a falha morria numa promise rejeitada: o botão
   * ficava inerte e a pessoa clicava de novo achando que não tinha clicado.
   * Ação que não avisa quando falha é pior que ação que não existe.
   */
  const executarAcao = async (acao: AcaoSugerida) => {
    if (!demanda || !user) return;
    try {
      switch (acao.tipo) {
        case "atribuir":
          await acoesDemanda.atribuir({ demandaId: demanda.id, pessoaId: user.id });
          toast.success("Demanda atribuída a você.");
          break;
        case "cobrar":
          await fio.comentar(acao.rascunho, false);
          break;
        case "responder":
          document.querySelector<HTMLTextAreaElement>("[data-fio-resposta]")?.focus();
          break;
        case "concluir":
          await acoesDemanda.concluir({ demandaId: demanda.id });
          toast.success("Demanda concluída.");
          break;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
    }
  };

  useContextoDeHeader(
    demanda ? (
      <>
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">{demanda.referencia}</span>
          <span className="truncate text-[13px] font-medium">{demanda.titulo}</span>
        </span>
        <button
          type="button"
          onClick={() => setPainel(!painel)}
          aria-label={painel ? "Ocultar o painel do Blink" : "Mostrar o painel do Blink"}
          aria-pressed={painel}
          title={painel ? "Ocultar o painel" : "Mostrar o painel"}
          className={cn(
            "ml-auto hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs lg:inline-flex",
            "transition-colors duration-fast ease-standard",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            painel ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Blink className="size-4" aria-hidden />
          {painel ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
        </button>
      </>
    ) : null,
    [demanda?.id, demanda?.referencia, demanda?.titulo, painel],
  );

  if (carregando) {
    return (
      <div className="flex h-full items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Carregando a demanda…</span>
      </div>
    );
  }

  if (erro || !demanda) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12" role="alert">
        <p className="text-[15px] font-medium text-destructive">
          {erro ? "Não foi possível carregar a demanda" : "Demanda não encontrada"}
        </p>
        {erro && <p className="mt-1 text-[13px] text-muted-foreground">{erro.message}</p>}
        <Button variant="ghost" size="sm" className="mt-4 gap-1.5" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-3.5" aria-hidden />
          Voltar
        </Button>
      </div>
    );
  }

  const d = demanda;

  /**
   * A tira de identidade: tipo · sistema · prioridade · SLA · IA.
   *
   * É a linha que o usuário lê antes de tudo, e por isso ela só mostra o que
   * distingue esta demanda. Cada item desaparece quando a fonte não sabe
   * respondê-lo — ausência é mais honesta que um traço.
   */
  const identidade = [
    capacidades.tipo && d.tipo ? TIPO_ROTULO[d.tipo] : null,
    d.sistema?.nome ?? null,
    d.prioridade ? PRIORIDADE_ROTULO[d.prioridade] : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border/60 px-5 py-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 size-6 shrink-0"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{d.referencia}</span>
              <span className={cn("text-[17px] font-medium leading-snug", d.concluida && "line-through")}>
                {d.titulo}
              </span>
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
              {identidade.map((item, i) => (
                <span key={item} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>·</span>}
                  {item}
                </span>
              ))}
              {capacidades.sla && d.sla?.venceEm && (
                <span className="flex items-center gap-2">
                  <span aria-hidden>·</span>
                  <span className={cn(d.sla.estado === "estourado" && "text-destructive")}>
                    SLA {new Date(d.sla.venceEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                </span>
              )}
              {d.risco && (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>·</span>
                  <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
                  <span className="text-foreground">{RISCO_ROTULO[d.risco]}</span>
                </span>
              )}
              {capacidades.ia && d.ia && (
                <span className="flex items-center gap-1.5 text-primary">
                  <span aria-hidden>·</span>
                  <Sparkles className="size-3" aria-hidden />
                  {d.ia.respondeuSozinha ? "respondida pela IA" : "com apoio da IA"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Onde ela está, em menos de um segundo. Vem da auditoria: zero IA. */}
        {progressao && <Progresso progressao={progressao} className="mt-2.5 pl-9" />}
      </header>

      {/*
        DUAS COLUNAS, NÃO TRÊS
        Eram `15rem | resto | 17rem` — 512px fixos de moldura. Num notebook de
        1440px, a conversa ficava com menos da metade da tela numa página cujo
        assunto É a conversa. A coluna de detalhes deixou de existir como
        coluna: virou uma seção dentro do painel da direita, fechada por
        padrão.

        O painel recolhe. Aberto por padrão, porque é onde mora a recomendação
        do Blink — a resposta a "o que faço agora". Mas some com um clique
        quando a pessoa só quer conversar, e a escolha é lembrada.
      */}
      {/*
        A LINHA QUE FALTAVA

        O grid declarava as COLUNAS e nunca a linha. Sem `grid-template-rows`,
        a linha implícita é `auto` — ou seja, ela cresce até caber o conteúdo
        inteiro. O `Fio` pedia `h-full` e recebia "a altura de tudo o que há
        dentro de mim", que é sempre suficiente: a barra de rolagem interna
        existia, estava correta, e nunca tinha o que rolar.

        `min-h-0` no container não resolve isso. Ele impede o container de
        travar no tamanho do conteúdo, mas o item de grid tem
        `min-height: auto` próprio, e é ele quem empurra a linha.

        `grid-rows-[minmax(0,1fr)]` diz o que faltava: uma linha só, do tamanho
        do espaço disponível, autorizada a ficar menor que o conteúdo. A partir
        daí o `overflow-y-auto` lá dentro tem o que fazer.

        Abaixo de `lg` o painel empilha embaixo da conversa, e aí são duas
        linhas — a altura fixa passaria a ser errada. Por isso a regra é só de
        `lg` para cima; no estreito, a página rola inteira, que é o
        comportamento certo quando não há colunas para dividir.
      */}
      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 overflow-y-auto rolagem-discreta",
          "lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden",
          painel ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : "lg:grid-cols-1",
        )}
      >
        <main className="min-h-0 min-w-0 lg:overflow-hidden">
          {capacidades.comentarios ? (
            <Fio
              eventos={eventos}
              pedido={
                d.descricao
                  ? { texto: d.descricao, autor: d.autor ? { ...d.autor, ia: false } : null, em: d.criadaEm }
                  : null
              }
              briefing={briefing}
              podeComentar={fio.podeComentar}
              podeNotaInterna={daEquipe}
              onComentar={fio.comentar}
              onEditarComentario={fio.editarComentario}
              onExcluirComentario={fio.excluirComentario}
              vazio="Ninguém falou nada ainda. Escreva a primeira mensagem."
            />
          ) : (
            <div className="px-5 py-8 text-[13px] leading-relaxed text-muted-foreground">
              Esta demanda veio de um projeto importado, que não guarda conversa nem histórico. Demandas criadas
              pelo assistente têm o fio completo.
            </div>
          )}
        </main>

        {painel && (
        <div className="flex min-h-0 flex-col overflow-y-auto rolagem-discreta border-l border-border/60">
        <CopilotoDaDemanda
          demanda={d}
          eventos={eventos}
          capacidades={capacidades}
          relacionados={conhecimento.relacionados}
          acoes={acoes}
          onAbrir={(destino) =>
            destino.startsWith("http")
              ? window.open(destino, "_blank", "noopener,noreferrer")
              : navigate(
                  destino.startsWith("/demandas/") && projetoId ? `${destino}?projeto=${projetoId}` : destino,
                )
          }
          onAcao={(a) => void executarAcao(a)}
          onGerarArtigo={d.concluida && rascunho ? () => setRascunhoAberto(true) : undefined}
          executando={acoesDemanda.executando}
          onRemoverResponsavel={
            daEquipe
              ? () => {
                  void desassumir(d.id, projetoId).catch((e: unknown) =>
                    toast.error(
                      e instanceof Error ? e.message : "Não foi possível remover a atribuição.",
                    ),
                  );
                }
              : undefined
          }
          removendoResponsavel={assumindo(d.id)}
          className="border-l-0"
        />

        {/* Critérios e anexos ficam VISÍVEIS quando existem — não são consulta.
            O critério é o contrato do que significa "pronto"; o anexo costuma
            explicar em dois segundos o que três parágrafos tentam descrever.
            Esconder os dois atrás de um clique seria trocar excesso de
            informação por excesso de cliques. */}
        <Checklist
          itens={checklist.itens}
          feitos={checklist.feitos}
          total={checklist.total}
          podeEditar={daEquipe && capacidades.progresso}
          onMarcar={(itemId, feito) => void checklist.marcar(itemId, feito)}
          onAcrescentar={(texto) => void checklist.acrescentar(texto)}
          onRemover={(itemId) => void checklist.remover(itemId)}
        />

        <Anexos
          anexos={anexos.anexos}
          podeAnexar={anexos.podeAnexar}
          enviando={anexos.enviando}
          onEnviar={(arquivos) => void anexos.enviar(arquivos)}
        />

        {/* A ÚNICA seção fechada. Quem, quando, sistema, etiquetas: dados que
            se consulta uma vez por demanda e que não mudam o que fazer agora.
            Uma seção só — não dez — porque trocar leitura por cliques não
            reduz esforço, apenas o transfere. */}
        <Secao id="detalhes" titulo="Detalhes">
          <Contexto
            demanda={d}
            capacidades={capacidades}
            eventos={eventos}
            className="-mx-4"
            onRemoverResponsavel={
              daEquipe
                ? () => {
                    void desassumir(d.id, projetoId).catch((e: unknown) =>
                      toast.error(
                        e instanceof Error ? e.message : "Não foi possível remover a atribuição.",
                      ),
                    );
                  }
                : undefined
            }
            removendoResponsavel={assumindo(d.id)}
          />
        </Secao>
        </div>
        )}
      </div>

      {rascunho && (
        <RascunhoDeArtigo
          rascunho={rascunho}
          aberto={rascunhoAberto}
          onFechar={() => setRascunhoAberto(false)}
          onPublicar={async (r) => {
            await publicar(r);
            setRascunhoAberto(false);
          }}
        />
      )}
    </div>
  );
}
