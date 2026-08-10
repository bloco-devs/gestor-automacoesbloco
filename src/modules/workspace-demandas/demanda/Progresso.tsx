import { memo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Etapa, Progressao } from "@/domain/demand";

/**
 * A linha do tempo da demanda, em forma de stepper.
 *
 * O QUE A SEPARA DE UM WIZARD
 * Wizard mostra passos idênticos e sugere que o trabalho anda sempre para
 * frente. Esta linha mostra três coisas que um wizard esconde, e são elas que a
 * deixam viva:
 *
 *   TEMPO       cada etapa cumprida carrega quantos dias levou, e a atual
 *               carrega há quantos dias está. "Em atendimento" é um rótulo;
 *               "Em atendimento há 19 dias" é uma decisão.
 *   PULO        etapa que a demanda atravessou sem passar aparece vazada, não
 *               verde. Pintar de verde o que ninguém fez é a mentira mais cara
 *               que essa tela poderia contar — some com "ninguém testou".
 *   RETRABALHO  voltas aparecem como fato, não como barra andando para trás.
 *
 * A ETAPA ATUAL É A ÚNICA COM RÓTULO SEMPRE VISÍVEL
 * As outras somem em telas estreitas. Em menos de um segundo o olho precisa
 * achar *onde está* — dar o mesmo peso a seis rótulos obriga a ler os seis
 * para descobrir qual importa. O anel que pulsa faz esse trabalho sozinho.
 *
 * Tudo vem da auditoria que já está no banco: nenhuma chamada de IA.
 */

function tempo(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias < 1) return "hoje";
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

/**
 * CAMADA DE EXIBIÇÃO, SÓ ELA
 * Traduz vocabulário de engenharia para o vocabulário de quem pediu. Não toca
 * em id, status nem em nada que o banco leia — o quadro continua com as
 * colunas que o time nomeou, e nomes fora do dicionário passam intactos.
 */
const ALIAS: Record<string, string> = {
  backlog: "Na fila",
  "a fazer": "Pronto para iniciar",
  "to do": "Pronto para iniciar",
  todo: "Pronto para iniciar",
  "em desenvolvimento": "Em atendimento",
  "em andamento": "Em atendimento",
  "in progress": "Em atendimento",
  "em testes": "Em validação",
  teste: "Em validação",
  testes: "Em validação",
  homologacao: "Em validação",
  concluido: "Entregue",
  concluida: "Entregue",
  done: "Entregue",
};

function normalizar(rotulo: string): string {
  return rotulo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Rótulo humano de uma etapa. Devolve o original quando não há tradução. */
export function rotuloAmigavel(rotulo: string): string {
  return ALIAS[normalizar(rotulo)] ?? rotulo;
}

function Marca({ etapa }: { etapa: Etapa }) {
  if (etapa.estado === "atual") {
    return (
      <span className="relative flex size-7 shrink-0 items-center justify-center" aria-hidden>
        {/* Sinal de vida: o anel emite, o círculo respira. Quem abre a página
            não deveria ter de procurar onde a demanda parou. */}
        <span className="absolute size-7 animate-ping rounded-full bg-primary/25 motion-reduce:animate-none" />
        <span className="absolute size-7 rounded-full bg-primary/10" />
        <span className="relative size-5 animate-pulse rounded-full border-2 border-primary bg-background motion-reduce:animate-none">
          <span className="absolute inset-1 rounded-full bg-primary" />
        </span>
      </span>
    );
  }
  if (etapa.estado === "concluida") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (etapa.estado === "pulada") {
    // Vazada com traço: cumprida e pulada não podem parecer a mesma coisa.
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-border"
      >
        <span className="h-px w-2 bg-border" />
      </span>
    );
  }
  return <span aria-hidden className="size-5 shrink-0 rounded-full border border-border bg-muted" />;
}

function ProgressoImpl({ progressao: p, className }: { progressao: Progressao; className?: string }) {
  if (p.etapas.length < 2) return null;

  const rotuloDoEstado: Record<Etapa["estado"], string> = {
    concluida: "cumprida",
    atual: "etapa atual",
    futura: "ainda não",
    pulada: "pulada",
  };

  return (
    <div className={cn("flex flex-col gap-2 border-b py-4", className)}>
      <ol className="flex items-start" aria-label="Andamento da demanda">
        {p.etapas.map((e, i) => {
          const legenda = tempo(e.dias);
          const rotulo = rotuloAmigavel(e.rotulo);
          const cumprida = e.estado === "concluida";
          const atual = e.estado === "atual";
          const proxima = p.etapas[i + 1];
          const linhaCumprida = cumprida && (proxima?.estado === "concluida" || proxima?.estado === "atual");
          return (
            <li
              key={e.id}
              className={cn("flex min-w-0 items-start", i < p.etapas.length - 1 && "flex-1")}
              aria-current={atual ? "step" : undefined}
            >
              <div
                className="flex min-w-0 flex-col items-center gap-1.5 text-center"
                title={`${rotulo} — ${rotuloDoEstado[e.estado]}${legenda ? `, ${legenda}` : ""}`}
              >
                <Marca etapa={e} />
                <span
                  className={cn(
                    "max-w-[9rem] truncate text-[12px] leading-tight",
                    atual ? "font-semibold text-foreground" : "hidden sm:inline",
                    cumprida && "text-muted-foreground",
                    e.estado === "futura" && "text-muted-foreground/60",
                    e.estado === "pulada" && "text-muted-foreground/60 line-through",
                  )}
                >
                  {rotulo}
                </span>
                {atual && legenda && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] leading-none text-primary">
                    {legenda}
                  </span>
                )}
              </div>
              {i < p.etapas.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1.5 mt-3 h-0.5 min-w-3 flex-1 rounded-full sm:mx-2",
                    linhaCumprida ? "bg-success" : "bg-border/60",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {p.retrabalho > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {/* Voltar é um fato do projeto, não um detalhe de interface. Três
              voltas costumam significar requisito mal entendido. */}
          Voltou {p.retrabalho} {p.retrabalho === 1 ? "vez" : "vezes"} para uma etapa anterior.
        </p>
      )}
    </div>
  );
}

export const Progresso = memo(ProgressoImpl);
