import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTodasAsDemandas, type EtapaDaFonte } from "@/modules/demand-access";
import {
  FILAS,
  type FilaId,
  aplicarFila,
  contarFilas,
  agrupar,
  sinaisUteis,
  unirGruposHomonimos,
} from "@/domain/demand";
import { BoardLente } from "@/modules/workspace-demandas/components/BoardLente";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferencia } from "@/hooks/usePreferencia";
import { cn } from "@/lib/utils";

// v2: a chave subiu de versão junto com a mudança de padrão. Quem já tinha
// "todas" gravado continuaria abrindo com o backlog inteiro — a escolha
// salva venceria um padrão que a pessoa nunca chegou a ver. Subir a versão
// dá a todo mundo uma primeira impressão da tela nova; quem preferir "todas"
// escolhe de novo, e aí sim fica gravado.
/**
 * A fila de Hoje usa o mesmo mecanismo de preferência do resto do sistema.
 * Antes esta tela tinha a própria cópia de leitura/gravação em localStorage,
 * com o próprio jeito de versionar chave — uma de três implementações
 * diferentes da mesma ideia espalhadas pelo código.
 *
 * "Minhas" como padrão: a tela chama "Hoje" e abria com o backlog somado de
 * todos os projetos, ordenado por status, com trabalho de duas semanas atrás
 * no topo. Isso é um arquivo, não um dia.
 */
const FILA_PADRAO: FilaId = "minhas";

function ehFila(v: unknown): v is FilaId {
  return typeof v === "string" && FILAS.some((f) => f.id === v);
}

/**
 * A esteira canônica desta tela — só as etapas EM ANDAMENTO.
 *
 * POR QUE ELA MORA AQUI, E NÃO NA CAMADA DE DADOS
 * `useTodasAsDemandas` soma DUAS fontes (colunas de quadro + o enum de status
 * de `demands`) e, por isso mesmo, não tem uma lista de etapas para devolver:
 * cada quadro tem as suas. O que existe em comum é o vocabulário — os nomes
 * abaixo são os que as duas fontes usam. A esteira é montada por RÓTULO
 * porque é o rótulo que o usuário lê, e é por ele que `unirGruposHomonimos`
 * já funde as duas fontes numa coluna só.
 *
 * Serve para uma coisa: garantir que "Em Testes" apareça mesmo quando ninguém
 * está testando nada. Sem isso, uma demanda no backlog desenharia UMA coluna,
 * e o quadro viraria uma lista de um item.
 *
 * "CONCLUÍDO" NÃO ESTÁ AQUI, DE PROPÓSITO
 * O quadro já trata grupos concluídos como faixa estreita recolhida. Ter o
 * rótulo na esteira criava uma coluna vazia sintética (que nunca nasce
 * recolhida, por não carregar o marcador de concluído) ao lado da faixa real:
 * "Concluído" aparecia duas vezes. Fora da esteira, o grupo real entra como
 * coluna extra no fim e recolhe sozinho, que é o comportamento desejado.
 */
const ESTEIRA = [
  "Backlog",
  "A Fazer",
  "Em Desenvolvimento",
  "Em Testes",
  "Homologação",
] as const;


function normalizar(rotulo: string): string {
  return rotulo.trim().toLocaleLowerCase("pt-BR");
}

/**
 * Hoje — o quadro do desenvolvedor, cruzando as duas fontes.
 *
 * ANTES: esta tela lia só `useDemands()` (tabela `demands`, a fila global do
 * Help Desk). Ficava vazia sempre que a única demanda real do momento vivesse
 * num quadro importado (`atividades_cards`) — que é, hoje, onde está o
 * trabalho de verdade. `useTodasAsDemandas` soma as duas fontes; a UI
 * continua sem saber que existem duas.
 *
 * A lente aqui é o BOARD, o mesmo componente do workspace de projeto. A lista
 * em acordeão saiu: ela agrupava por status exatamente como o quadro, mudando
 * só o desenho — e "o que está em cada etapa" é uma pergunta que um quadro
 * responde de relance e uma lista responde depois de expandir três blocos.
 *
 * SOMENTE LEITURA, E ISSO É UMA DECISÃO
 * `podeMover={false}`. Mover daqui exigiria uma camada de escrita que
 * traduzisse o destino para "trocar a coluna do card" ou "trocar o enum de
 * status" conforme a fonte da demanda — que é justamente o que esta tela não
 * sabe (e não deve saber). Enquanto essa camada não existe, arrastar sem
 * efeito seria pior do que não arrastar.
 *
 * Abrir uma demanda navega para `/demandas/:id`, a página real — nunca um
 * preview embutido.
 */
export default function DeveloperWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { demandas, projetoPorDemanda, capacidades, carregando } = useTodasAsDemandas();
  const [fila, setFila] = usePreferencia<FilaId>("hoje:fila", FILA_PADRAO, ehFila);

  const contagens = useMemo(() => contarFilas(demandas, user?.id ?? null), [demandas, user?.id]);
  const filtradas = useMemo(
    () => aplicarFila(demandas, fila, user?.id ?? null),
    [demandas, fila, user?.id],
  );
  // `unirGruposHomonimos` porque esta tela soma duas fontes: a coluna
  // "Backlog" de um quadro e o status "backlog" de `demands` são status
  // diferentes com o mesmo nome, e apareciam como duas colunas "BACKLOG"
  // lado a lado — parecia dado duplicado.
  const grupos = useMemo(
    () => unirGruposHomonimos(agrupar(filtradas, "board")),
    [filtradas],
  );
  const sinais = useMemo(() => sinaisUteis(filtradas), [filtradas]);

  /**
   * A esteira, resolvida contra os grupos que existem agora.
   *
   * Para cada nome da esteira: se já há um grupo com aquele rótulo, a etapa
   * usa o ID DELE — o `BoardLente` casa etapa com grupo por id, e um id
   * inventado faria a coluna aparecer duas vezes (uma vazia, uma cheia).
   * Se não há, entra um id sintético e a coluna renderiza vazia.
   *
   * Colunas customizadas de quadros importados não estão nesta lista: o
   * `BoardLente` as reconhece como órfãs e as desenha no fim, para nenhum
   * dado sumir da tela.
   */
  const etapas = useMemo<EtapaDaFonte[]>(() => {
    const porRotulo = new Map(grupos.map((g) => [normalizar(g.rotulo), g]));
    return ESTEIRA.map((rotulo) => {
      const grupo = porRotulo.get(normalizar(rotulo));
      return { id: grupo?.id ?? `esteira:${normalizar(rotulo)}`, rotulo: grupo?.rotulo ?? rotulo };
    });
  }, [grupos]);

  function selecionarFila(f: FilaId) {
    setFila(f);
  }

  const abrir = useCallback(
    (id: string) => {
      const projetoId = projetoPorDemanda.get(id);
      navigate(projetoId ? `/demandas/${id}?projeto=${projetoId}` : `/demandas/${id}`);
    },
    [navigate, projetoPorDemanda],
  );

  // Somente leitura: existe para satisfazer o contrato do board, e nunca é
  // chamado porque `podeMover` é falso (os cartões não ficam arrastáveis).
  const naoMove = useCallback(() => {}, []);

  return (
    <div className="flex h-[calc(100vh-var(--app-header-h,3.5rem))] w-full flex-col">
      <nav
        aria-label="Fila"
        className="flex h-10 items-center gap-0.5 overflow-x-auto border-b border-border bg-card/40 px-3 md:px-6"
      >
        {FILAS.map((f) => {
          const ativa = f.id === fila;
          const n = contagens[f.id];
          return (
            <button
              key={f.id}
              type="button"
              aria-current={ativa ? "true" : undefined}
              title={f.ajuda}
              onClick={() => selecionarFila(f.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                ativa
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              {f.rotulo}
              <span className={cn("tabular-nums", !ativa && "text-muted-foreground/70")}>{n}</span>
            </button>
          );
        })}
      </nav>

      {/* Sem `overflow-y-auto` aqui: o quadro rola na horizontal por fora e
          cada coluna rola na vertical por dentro. Um scroll vertical no pai
          brigaria com os dois. */}
      <div className="min-h-0 flex-1 px-4 py-3 md:px-6">
        {carregando ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <BoardLente
            grupos={grupos}
            etapas={etapas}
            capacidades={capacidades}
            sinais={sinais}
            onAbrir={abrir}
            onMover={naoMove}
            podeMover={false}
            vazio={{
              titulo:
                fila === "minhas"
                  ? "Nada atribuído a você"
                  : fila === "todas"
                    ? "Nada por aqui ainda"
                    : "Nada nesta fila",
              descricao:
                fila === "minhas"
                  ? "Veja \u201cNão atribuídas\u201d para assumir algo, ou \u201cEm risco\u201d para o que está travado."
                  : fila === "todas"
                    ? "Nenhuma demanda em nenhum projeto no momento."
                    : "Troque de fila ou espere novas demandas chegarem.",
            }}
          />
        )}
      </div>
    </div>
  );
}
