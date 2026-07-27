import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useContextoDeHeader } from "@/components/shell/HeaderContexto";
import { cn } from "@/lib/utils";
import { useDemanda, useFioDaDemanda, type Escopo } from "@/modules/demand-access";
import {
  PRIORIDADE_ROTULO,
  RISCO_ROTULO,
  TIPO_ROTULO,
  montarFio,
  type Pessoa,
} from "@/domain/demand";
import { Contexto } from "./demanda/Contexto";
import { Fio } from "./demanda/Fio";
import { CopilotoDaDemanda } from "./demanda/CopilotoDaDemanda";

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

  const { demanda, demandas, capacidades, carregando, erro } = useDemanda(escopo, id ?? null);

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
  const daEquipe = user?.role === "developer" || user?.role === "administrador";

  const fio = useFioDaDemanda(id ?? null, {
    habilitado: capacidades.comentarios,
    pessoas,
    internasVisiveis: daEquipe,
  });

  const eventos = useMemo(() => montarFio(fio.eventos, daEquipe), [fio.eventos, daEquipe]);

  useContextoDeHeader(
    demanda ? (
      <span className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 tabular-nums text-[12px] text-muted-foreground">{demanda.referencia}</span>
        <span className="truncate text-[13px] font-medium">{demanda.titulo}</span>
      </span>
    ) : null,
    [demanda],
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
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_17rem]">
        <Contexto
          demanda={d}
          capacidades={capacidades}
          eventos={eventos}
          className="min-h-0 overflow-y-auto border-b border-border/60 lg:border-b-0 lg:border-r"
        />

        <main className="min-h-0 min-w-0">
          {capacidades.comentarios ? (
            <Fio
              eventos={eventos}
              podeComentar={fio.podeComentar}
              podeNotaInterna={daEquipe}
              onComentar={fio.comentar}
              vazio="Ninguém falou nada ainda. Escreva a primeira mensagem."
            />
          ) : (
            <div className="px-5 py-8 text-[13px] leading-relaxed text-muted-foreground">
              Esta demanda veio de um projeto importado, que não guarda conversa nem histórico. Demandas criadas
              pelo assistente têm o fio completo.
            </div>
          )}
        </main>

        <CopilotoDaDemanda
          demanda={d}
          eventos={eventos}
          capacidades={capacidades}
          universo={demandas}
          onAbrir={(outroId) =>
            navigate(`/demandas/${outroId}${projetoId ? `?projeto=${projetoId}` : ""}`)
          }
          className="hidden xl:flex"
        />
      </div>
    </div>
  );
}
