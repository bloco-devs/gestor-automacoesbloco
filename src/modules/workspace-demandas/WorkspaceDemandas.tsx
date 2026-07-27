import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAcoesDemanda, useDemandas, type Escopo } from "@/modules/demand-access";
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
import { CabecalhoProjeto } from "./components/CabecalhoProjeto";
import { FilaBar, LenteBar, isFilaId, isLenteId } from "./components/Barras";
import { ListaLente } from "./components/ListaLente";
import { BoardLente } from "./components/BoardLente";
import { GanttLente } from "./components/GanttLente";
import { Copiloto } from "./components/Copiloto";

/**
 * FEATURE 027 (reescrita) — Workspace de Demandas.
 *
 * Este componente não sabe de onde vêm os dados.
 *
 * Ele monta um `Escopo`, chama `useDemandas` e recebe `Demanda[]`. Não importa
 * `useAtividadesBoard`, não importa `useDemands`, não conhece `AtividadeCard`
 * nem `Demand`, e não sabe o que é uma coluna de quadro. Abandonar
 * `atividades_cards` amanhã é editar `resolverFonte.ts` — este arquivo não
 * muda uma linha.
 *
 * A tela é `fila × lente`:
 *   a FILA recorta quais demandas (`aplicarFila`)
 *   a LENTE decide como agrupar (`agrupar`)
 * As cinco visualizações não são cinco telas: são o mesmo conjunto com dois
 * parâmetros na URL. As duas barras ficam fixas em todas elas — inclusive no
 * Board, que antes trocava a moldura inteira.
 */
export default function WorkspaceDemandas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projetoId } = useParams<{ projetoId: string }>();
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState("");

  const escopo: Escopo = useMemo(
    () => (projetoId ? { tipo: "projeto", projetoId } : { tipo: "global" }),
    [projetoId],
  );

  const lente: LenteId = isLenteId(params.get("lente")) ? (params.get("lente") as LenteId) : "lista";
  const fila: FilaId = isFilaId(params.get("fila")) ? (params.get("fila") as FilaId) : "todas";

  const trocar = (chave: "lente" | "fila", valor: string) => {
    const proximo = new URLSearchParams(params);
    proximo.set(chave, valor);
    setParams(proximo, { replace: true });
  };

  const { demandas, projeto, capacidades, carregando, erro } = useDemandas(escopo);
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
  // O segundo e calculado sobre o recorte visivel, entao muda com a fila.
  const capacidadesVisiveis = useMemo(() => {
    const temPrazo = demandas.some((d) => d.prazo !== null);
    return {
      ...capacidades,
      prazo: capacidades.prazo && temPrazo,
      sla: capacidades.sla && temPrazo,
    };
  }, [capacidades, demandas]);

  const sinais = useMemo(() => sinaisUteis(visiveis), [visiveis]);

  // O detalhe tem endereço próprio. Era a mudança estrutural que faltava para
  // uma demanda poder ser colada num Slack ou num e-mail.
  const abrir = (id: string) => navigate(`/demandas/${id}${projetoId ? `?projeto=${projetoId}` : ""}`);

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
      {projeto && (
        <CabecalhoProjeto
          projeto={projeto}
          resumo={resumo}
          onFila={(f) => trocar("fila", f)}
        />
      )}
      <FilaBar fila={fila} onFila={(f) => trocar("fila", f)} contagens={contagens} />
      <LenteBar
        lente={lente}
        onLente={(l) => trocar("lente", l)}
        busca={busca}
        onBusca={setBusca}
        total={daFila.length}
        filtradas={visiveis.length}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-0 px-5 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
          <div className="min-w-0">
            {lente === "board" ? (
              <BoardLente
                grupos={grupos}
                capacidades={capacidadesVisiveis}
                sinais={sinais}
                onAbrir={abrir}
                onMover={({ demandaId, statusId }) => void acoes.mover({ demandaId, statusId })}
                podeMover={acoes.podeMover}
              />
            ) : lente === "gantt" ? (
              <GanttLente demandas={visiveis} onAbrir={abrir} />
            ) : (
              <ListaLente
                grupos={grupos}
                capacidades={capacidadesVisiveis}
                sinais={sinais}
                onAbrir={abrir}
                mostrarStatusNaLinha={lente !== "lista"}
                vazio={{
                  titulo: busca ? "Nenhuma demanda encontrada" : "Nada nesta fila",
                  descricao: busca ? "Tente outro termo ou limpe o filtro." : undefined,
                }}
              />
            )}
          </div>

          <Copiloto demandas={daFila} resumo={resumo} onAbrir={abrir} className="hidden xl:block" />
        </div>
      </div>
    </div>
  );
}
