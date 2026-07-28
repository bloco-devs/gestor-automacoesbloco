import { memo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Blink } from "@/components/blink/Blink";
import {
  RISCO_ROTULO,
  deQuemEAVez,
  diasSemFala,
  type AcaoSugerida,
  type Relacionado,
  type Capacidades,
  type Demanda,
  type Evento,
} from "@/domain/demand";

/**
 * O copiloto desta demanda — analítico, nunca conversacional.
 *
 * A REGRA QUE O SEPARA DO FIO
 * O fio é onde se fala. Este painel é onde se **conclui**. Ele não tem campo de
 * texto, não faz perguntas e não espera resposta: ele responde, sempre nesta
 * ordem, cinco perguntas de quem abriu a demanda para decidir o que fazer:
 *
 *   O que está acontecendo?      risco, prazo, silêncio
 *   De quem é a vez?             a causa nº 1 de demanda parada
 *   Já se sabe algo disso?       demanda parecida, solução anterior, artigo
 *   Qual o próximo passo?        uma ação, não uma lista
 *   Quem deveria assumir?        quando não há responsável
 *
 * INFORMAR NÃO É PROPOR
 * "Esta demanda está parada há 5 dias" devolve o problema para o humano
 * resolver — é o que quase todo dashboard faz, e é por isso que quase todo
 * dashboard é ignorado. Aqui o diagnóstico vem com o passo seguinte junto, no
 * mesmo lugar, a um clique. Nenhuma dessas ações é nova: todas já existem na
 * porta de escrita. O copiloto não ganha poder, ganha oportunidade — ele
 * oferece a ação no instante em que a pessoa entendeu o porquê.
 *
 * TUDO AQUI É DERIVADO, NÃO GERADO
 * Nenhum bloco depende de o modelo de IA responder. São regras sobre os dados
 * que já existem — por isso o painel nunca fica vazio, nunca fica carregando e
 * nunca mente. Quando o modelo entrar, ele substitui o *texto* de "o que está
 * acontecendo"; a estrutura não muda. Assim a interface não acende quando a IA
 * funciona nem apaga quando ela falha.
 */

interface Props {
  demanda: Demanda;
  eventos: Evento[];
  capacidades: Capacidades;
  /**
   * O que já existe sobre este problema, com o motivo de cada item.
   *
   * O motivo não é enfeite: uma lista de links produz a sensação de resultado
   * de busca — trabalho que ainda vai ter. "Mesmo sistema, fala de exportação"
   * produz a sensação de que alguém já pesquisou. É a diferença inteira.
   */
  relacionados: Relacionado[];
  acoes: AcaoSugerida[];
  /**
   * Oferecer o rascunho de artigo. Só aparece em demanda concluída — antes
   * disso não há solução para documentar, e perguntar seria ruído.
   */
  onGerarArtigo?: () => void;
  /** Recebe a rota de destino, não um id: o relacionado pode não ser demanda. */
  onAbrir: (destino: string) => void;
  /** Cada ação é executada pela porta de escrita; este painel só dispara. */
  onAcao: (acao: AcaoSugerida) => void;
  executando: boolean;
  className?: string;
}

/** O gênero vira palavra, porque ícone sozinho não diz o que a coisa é. */
const ETIQUETA: Record<Relacionado["genero"], string> = {
  demanda: "Demanda parecida",
  solucao: "Solução anterior",
  artigo: "Artigo",
};

/**
 * O painel eram seis blocos separados por 12px e uma linha fina — na prática,
 * um texto corrido de assuntos diferentes. Cada bloco responde a uma pergunta
 * distinta ("o que está acontecendo", "de quem é a vez", "próximo passo"), e
 * sem intervalo entre elas a pessoa lê tudo como um parágrafo só.
 *
 * Mais ar em volta, e o título com peso próprio para funcionar como âncora de
 * varredura — é por ele que se acha a seção certa sem ler as outras.
 */
function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border/50 px-4 py-4 last:border-b-0">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/90">
        {titulo}
      </h3>
      <div className="mt-2 text-[13px] leading-relaxed">{children}</div>
    </section>
  );
}

function CopilotoDaDemandaImpl({
  demanda: d,
  eventos,
  capacidades,
  relacionados,
  acoes,
  onGerarArtigo,
  onAbrir,
  onAcao,
  executando,
  className,
}: Props) {
  const silencio = diasSemFala(eventos);
  const vez = deQuemEAVez(eventos, d.autor?.id ?? null);
  const parecidas = relacionados;

  /**
   * O próximo passo é UM. Uma lista de sugestões é uma decisão adiada — quem
   * abre um painel de copiloto quer saber por onde começar, não escolher entre
   * cinco opções que o sistema não soube priorizar.
   */
  const proximoPasso = (() => {
    if (d.concluida) return "Nada. Esta demanda está concluída.";
    if (d.responsaveis.length === 0) return "Atribuir um responsável — ninguém está com ela.";
    if (capacidades.sla && d.sla?.estado === "estourado") return "O prazo já passou. Avisar quem abriu.";
    if (vez === "equipe") return "Responder — quem abriu está esperando.";
    if (silencio !== null && silencio >= 7) return `Sem uma palavra há ${silencio} dias. Dar um sinal de vida.`;
    if (parecidas.length > 0) return "Conferir o que já existe antes de começar do zero.";
    return "Seguir. Nada está bloqueando.";
  })();

  return (
    <aside
      aria-label="Blink — análise desta demanda"
      className={cn("flex min-h-0 flex-col overflow-y-auto border-l border-border/60", className)}
    >
      <header className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <Blink className="size-5 shrink-0" aria-hidden />
        <span className="text-[13px] font-medium">Blink</span>
      </header>

      {/*
        A RECOMENDAÇÃO VEM PRIMEIRO, E COM PESO
        Antes ela era o quarto de cinco blocos idênticos — para chegar nela,
        a pessoa lia diagnóstico, vez e relacionados. Um copiloto que faz você
        ler três parágrafos antes de dizer o que fazer é um relatório.

        Agora é a primeira coisa da coluna, sobre superfície própria e com a
        ação a um clique. O diagnóstico continua existindo logo abaixo, mas
        como apoio à decisão — que é o papel dele.
      */}
      <section className="border-b border-border/50 bg-muted/30 px-4 py-3.5">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Próximo passo
        </h3>
        <p className="mt-1.5 text-[14px] font-medium leading-snug text-foreground">{proximoPasso}</p>

        {/* Cada ação vem com o motivo dela logo abaixo — o par respira junto e
            se separa do vizinho, senão o agrupamento visual diz o contrário do
            significado. */}
        {acoes.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {acoes.map((a) => (
              <div key={a.tipo}>
                <Button
                  size="sm"
                  disabled={executando}
                  onClick={() => onAcao(a)}
                  className="h-8 w-full justify-start text-[12px]"
                >
                  {a.rotulo}
                </Button>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{a.motivo}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Bloco titulo="O que está acontecendo">
        {d.concluida ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">Concluída. Nada pendente.</p>
            {/* O ciclo só fecha se a pergunta aparecer no momento em que a
                pessoa ainda lembra do que fez. Uma semana depois ela não
                escreve mais — não por preguiça, por esquecimento. */}
            {onGerarArtigo && (
              <Button variant="outline" size="sm" onClick={onGerarArtigo} className="h-7 w-full justify-start text-[12px]">
                Virar artigo da base
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {d.risco && (
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-destructive" />
                {RISCO_ROTULO[d.risco]}
              </li>
            )}
            {silencio !== null && silencio >= 3 && (
              <li className="text-muted-foreground">Sem uma fala há {silencio} dias.</li>
            )}
            {d.responsaveis.length === 0 && <li className="text-muted-foreground">Ninguém assumiu.</li>}
            {!d.risco && (silencio === null || silencio < 3) && d.responsaveis.length > 0 && (
              <li className="text-muted-foreground">Nada fora do lugar.</li>
            )}
          </ul>
        )}
      </Bloco>

      {!d.concluida && (
        <Bloco titulo="De quem é a vez">
          {vez === "equipe" && <p>Da equipe. Quem abriu falou por último.</p>}
          {vez === "solicitante" && <p className="text-muted-foreground">De quem abriu. Já respondemos.</p>}
          {vez === "ninguem" && <p className="text-muted-foreground">Ninguém falou ainda.</p>}
        </Bloco>
      )}

      {parecidas.length > 0 && (
        <Bloco titulo="Já se sabe disso">
          <ul className="space-y-2">
            {parecidas.map((r) => (
              <li key={`${r.genero}:${r.id}`}>
                <button
                  type="button"
                  onClick={() => onAbrir(r.destino)}
                  className="text-left leading-snug transition-colors hover:text-primary focus:outline-none focus-visible:underline"
                >
                  {r.titulo}
                </button>
                <span className="mt-0.5 block text-[12px] leading-tight text-muted-foreground">
                  {ETIQUETA[r.genero]} · {r.porque}
                </span>
              </li>
            ))}
          </ul>
        </Bloco>
      )}


      {!d.concluida && d.responsaveis.length === 0 && (
        <Bloco titulo="Quem poderia assumir">
          {/* Deliberadamente honesto: sem histórico de quem resolveu o quê, o
              sistema não tem base para sugerir uma pessoa. Inventar um nome
              aqui seria a pior forma de perder confiança na IA. */}
          <p className="text-muted-foreground">
            Ainda não sei dizer. Falta histórico de quem resolveu demandas parecidas.
          </p>
        </Bloco>
      )}
    </aside>
  );
}

export const CopilotoDaDemanda = memo(CopilotoDaDemandaImpl);
