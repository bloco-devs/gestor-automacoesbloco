import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useContextoDeHeader } from "@/components/shell/HeaderContexto";
import { cn } from "@/lib/utils";
import { useAcoesDemanda, useDemandas, ehInbox, type Escopo } from "@/modules/demand-access";
import {
  agrupar,
  aplicarFila,
  buscar,
  contarFilas,
  resumir,
  sinaisUteis,
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
  const [copiloto, setCopiloto] = useState(true);

  // A Inbox é a fila de quem ainda não foi classificado. Ela mora na mesma
  // rota dos projetos porque, para quem navega, é um destino irmão — mas o
  // escopo é global: não há projeto, e é exatamente esse o ponto.
  const naInbox = ehInbox(projetoId);

  const escopo: Escopo = useMemo(
    () => (projetoId && !naInbox ? { tipo: "projeto", projetoId } : { tipo: "global" }),
    [projetoId, naInbox],
  );

  const lente: LenteId = isLenteId(params.get("lente")) ? (params.get("lente") as LenteId) : "board";
  const fila: FilaId = isFilaId(params.get("fila")) ? (params.get("fila") as FilaId) : "todas";

  const trocar = (chave: "lente" | "fila", valor: string) => {
    const proximo = new URLSearchParams(params);
    proximo.set(chave, valor);
    setParams(proximo, { replace: true });
  };

  const { demandas, projeto, etapas, capacidades, carregando, erro } = useDemandas(escopo);
  const acoes = useAcoesDemanda(escopo);

  const contagens = useMemo(() => contarFilas(demandas, user?.id ?? null), [demandas, user?.id]);
  const daFila = useMemo(() => aplicarFila(demandas, fila, user?.id ?? null), [demandas, fila, user?.id]);
  const visiveis = useMemo(() => buscar(daFila, busca), [daFila, busca]);
  const grupos = useMemo(() => agrupar(visiveis, lente), [visiveis, lente]);
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

  // O detalhe tem endereço próprio. Era a mudança estrutural que faltava para
  // uma demanda poder ser colada num Slack ou num e-mail.
  const abrir = (id: string) =>
    navigate(`/demandas/${id}${projetoId && !naInbox ? `?projeto=${projetoId}` : ""}`);

  // A Inbox não tem projeto para descrever, mas precisa dizer onde a pessoa
  // está e quanto trabalho aguarda classificação — senão o header cai no
  // breadcrumb genérico e a tela parece a mesma dos projetos.
  const contextoInbox = (
    <>
      <ContextoDaInbox aguardando={resumo.abertas} />
      <button
        type="button"
        onClick={() => setCopiloto((v) => !v)}
        aria-label={copiloto ? "Ocultar copiloto" : "Mostrar copiloto"}
        className={cn(
          "ml-auto hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs xl:inline-flex",
          "transition-colors duration-fast ease-standard",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          copiloto ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sparkles className="size-3.5" aria-hidden />
        {copiloto ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
      </button>
    </>
  );

  useContextoDeHeader(
    naInbox ? (
      contextoInbox
    ) : projeto ? (
      <>
        <ContextoDoProjeto projeto={projeto} resumo={resumo} onFila={(f) => trocar("fila", f)} />
        <button
          type="button"
          onClick={() => setCopiloto((v) => !v)}
          aria-label={copiloto ? "Ocultar copiloto" : "Mostrar copiloto"}
          className={cn(
            "ml-auto hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs xl:inline-flex",
            "transition-colors duration-fast ease-standard",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            copiloto ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="size-3.5" aria-hidden />
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

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className={cn(
            // Sem largura maxima e com respiro minimo: numa tela de 2560px o
            // antigo max-w-[1400px] deixava 1160px de cinza dos dois lados
            // enquanto o board rolava na horizontal.
            "grid w-full grid-cols-1 gap-0 px-3 py-3 md:px-4",
            copiloto && "xl:grid-cols-[minmax(0,1fr)_17rem] xl:gap-4",
          )}
        >
          <div className="min-w-0">
            {lente === "board" ? (
              <BoardLente
                grupos={grupos}
                etapas={etapas}
                capacidades={capacidadesVisiveis}
                sinais={sinais}
                onAbrir={abrir}
                onMover={({ demandaId, statusId }) => void acoes.mover({ demandaId, statusId })}
                podeMover={acoes.podeMover}
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

          {copiloto && <Copiloto demandas={daFila} resumo={resumo} onAbrir={abrir} className="hidden xl:block" />}
        </div>
      </div>
    </div>
  );
}
