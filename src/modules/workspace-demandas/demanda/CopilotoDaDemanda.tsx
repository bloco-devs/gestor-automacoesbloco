import { memo } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RISCO_ROTULO,
  deQuemEAVez,
  diasSemFala,
  semelhantes,
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
 *   Existe algo semelhante?      duplicidade e reaproveitamento
 *   Qual o próximo passo?        uma ação, não uma lista
 *   Quem deveria assumir?        quando não há responsável
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
  universo: Demanda[];
  onAbrir: (id: string) => void;
  className?: string;
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border/50 px-4 py-3 last:border-b-0">
      <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      <div className="mt-1.5 text-[13px] leading-relaxed">{children}</div>
    </section>
  );
}

function CopilotoDaDemandaImpl({ demanda: d, eventos, capacidades, universo, onAbrir, className }: Props) {
  const silencio = diasSemFala(eventos);
  const vez = deQuemEAVez(eventos, d.autor?.id ?? null);
  const parecidas = semelhantes(d, universo, 3);

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
    if (parecidas.length > 0) return "Conferir as parecidas antes de trabalhar em duplicidade.";
    return "Seguir. Nada está bloqueando.";
  })();

  return (
    <aside
      aria-label="Copiloto desta demanda"
      className={cn("flex min-h-0 flex-col overflow-y-auto border-l border-border/60", className)}
    >
      <header className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="text-[13px] font-medium">Copiloto</span>
      </header>

      <Bloco titulo="O que está acontecendo">
        {d.concluida ? (
          <p className="text-muted-foreground">Concluída. Nada pendente.</p>
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
        <Bloco titulo="Parecidas">
          <ul className="space-y-1.5">
            {parecidas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(p.id)}
                  className="text-left transition-colors hover:text-primary focus:outline-none focus-visible:underline"
                >
                  {p.titulo}
                </button>
                <span className="block text-[12px] text-muted-foreground">{p.status.rotulo}</span>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Bloco titulo="Próximo passo">
        <p>{proximoPasso}</p>
      </Bloco>

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
