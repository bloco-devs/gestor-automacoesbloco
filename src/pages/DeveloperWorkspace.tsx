import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  useTodasAsDemandas,
  useAssumirDemanda,
  useMoverDemanda,
  type EtapaDaFonte,
} from "@/modules/demand-access";
import { useReordenarFila } from "@/modules/demand-access/useReordenarFila";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { reorderCardsBulk } from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { ordensDaLista } from "@/modules/workspace-demandas/ordenacao";


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
 * ARRASTO LIGADO, COM TRADUÇÃO NA BORDA
 * `podeMover`. O board devolve o id da coluna de destino — que pertence a uma
 * fonte só — e esta tela traduz para o RÓTULO da etapa antes de entregar a
 * `useMoverDemanda`, que decide entre trocar a coluna do cartão (quadro) ou o
 * enum de status (fila global). A tela continua sem conhecer tabela.

 *
 * Abrir uma demanda navega para `/demandas/:id`, a página real — nunca um
 * preview embutido.
 */
export default function DeveloperWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Esta é a fila de TRIAGEM: só chamados. Tarefas de projeto/Sprint vivem no
  // quadro do projeto (`/workspace/demandas/:projeto`) — somá-las aqui inflava
  // contadores e misturava dois contextos de trabalho diferentes.
  const { demandas, projetoPorDemanda, capacidades, carregando } = useTodasAsDemandas({
    incluirCartoesDeProjeto: false,
  });

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
   * Colunas customizadas de quadros importados — e os grupos concluídos —
   * não estão nesta lista: o `BoardLente` os reconhece como órfãos, desenha no
   * fim e recolhe os concluídos sozinho.
   */
  const etapas = useMemo<EtapaDaFonte[]>(() => {
    // Grupos concluídos ficam de fora mesmo quando o rótulo casa: promovê-los
    // a coluna da esteira devolveria a duplicação que este filtro corrige.
    const porRotulo = new Map(
      grupos.filter((g) => !g.concluido).map((g) => [normalizar(g.rotulo), g]),
    );
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

  /**
   * Mover: o board entrega o ID da coluna de destino, e esse id pertence a
   * UMA fonte (coluna de um quadro, enum de `demands`, ou `esteira:` quando a
   * coluna está vazia). Aqui ele é traduzido para o RÓTULO — que é o que as
   * duas fontes têm em comum — e a camada de acesso resolve o resto.
   */
  const rotuloPorStatusId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of etapas) mapa.set(e.id, e.rotulo);
    for (const g of grupos) mapa.set(g.id, g.rotulo);
    return mapa;
  }, [etapas, grupos]);

  const { mover, movendo } = useMoverDemanda();
  const qc = useQueryClient();
  const filaDeDemandas = useReordenarFila("demands", ["demands"]);


  /**
   * POSIÇÃO TAMBÉM É ESCRITA
   *
   * O quadro entrega a coluna de destino INTEIRA na ordem final. Antes esta
   * tela descartava essa lista e só trocava a etapa — reordenar na vertical
   * não gravava nada, e a próxima leitura devolvia a ordem antiga (o cartão
   * "voltava" ao lugar).
   *
   * Cada id vai para a fonte que o guarda: cartão de quadro pela RPC
   * transacional de posições, demanda da fila global pela ordem manual.
   */
  const gravarOrdem = useCallback(
    async (statusId: string, ordemDaColuna: string[]) => {
      const cartoes: { id: string; colunaId: string; ordem: number }[] = [];
      const tickets: string[] = [];
      ordemDaColuna.forEach((id) => {
        const projetoId = projetoPorDemanda.get(id);
        if (projetoId) cartoes.push({ id, colunaId: statusId, ordem: cartoes.length });
        else tickets.push(id);
      });
      const trabalhos: Promise<unknown>[] = [];
      // A RPC grava posição por coluna; ids sintéticos (`esteira:`) não são
      // coluna de banco nenhuma, então nesse caso só a ordem dos tickets vale.
      if (cartoes.length > 0 && !statusId.startsWith("esteira:")) {
        trabalhos.push(reorderCardsBulk(cartoes));
      }
      if (tickets.length > 0) trabalhos.push(filaDeDemandas.reordenar(ordensDaLista(tickets)));
      if (trabalhos.length === 0) return;
      await Promise.all(trabalhos);
      await qc.invalidateQueries({ queryKey: atividadesKeys.all });
    },
    [filaDeDemandas, projetoPorDemanda, qc],
  );

  const lidarComMovimento = useCallback(
    ({
      demandaId,
      statusId,
      ordemDaColuna,
    }: {
      demandaId: string;
      statusId: string;
      ordemDaColuna?: string[];
    }) => {
      if (movendo(demandaId)) return;
      const rotulo =
        rotuloPorStatusId.get(statusId) ??
        (statusId.startsWith("esteira:") ? statusId.slice("esteira:".length) : null);
      if (!rotulo) return;

      const grupoDeOrigem = grupos.find((g) => g.itens.some((d) => d.id === demandaId));
      const mesmaEtapa = grupoDeOrigem?.id === statusId;

      // A promessa é DEVOLVIDA: é ela que o board usa para desfazer o otimismo
      // quando a gravação é recusada. Avisamos e relançamos.
      const aoFalhar = (e: unknown) => {
        toast({
          title: "Não deu para mover",
          description: e instanceof Error ? e.message : "Tente de novo em instantes.",
          variant: "destructive",
        });
        throw e;
      };

      // Arrasto vertical: nada de trocar de etapa (trocar para a MESMA etapa
      // desmarcaria a conclusão de um cartão da faixa de concluídos).
      if (mesmaEtapa) {
        if (ordemDaColuna && ordemDaColuna.length > 0) {
          return gravarOrdem(statusId, ordemDaColuna).catch(aoFalhar);
        }
        return;
      }

      return mover(demandaId, projetoPorDemanda.get(demandaId) ?? null, rotulo)
        .then(() => {
          if (ordemDaColuna && ordemDaColuna.length > 0) {
            return gravarOrdem(statusId, ordemDaColuna);
          }
        })
        .catch(aoFalhar);

    },
    [gravarOrdem, grupos, mover, movendo, projetoPorDemanda, rotuloPorStatusId],
  );


  /**
   * Assumir é a outra escrita desta tela. A fonte da demanda é decidida aqui,
   * pelo mapa que a própria tela já tinha: com projeto é cartão de quadro, sem
   * projeto é ticket da fila global. O cartão não sabe nada disso.
   */
  const { assumir, assumindo } = useAssumirDemanda();
  const aoAssumir = useCallback(
    (id: string) => {
      if (!user?.id) return;
      void assumir(id, projetoPorDemanda.get(id) ?? null, user.id).catch((e: unknown) => {
        toast({
          title: "Não deu para assumir",
          description: e instanceof Error ? e.message : "Tente de novo em instantes.",
          variant: "destructive",
        });
      });
    },
    [assumir, projetoPorDemanda, user?.id],
  );

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
            onMover={lidarComMovimento}
            podeMover
            onAssumir={user?.id ? aoAssumir : undefined}
            assumindo={assumindo}
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
