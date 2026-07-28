import { memo } from "react";
import { Paperclip, ListChecks, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  PRIORIDADE_ROTULO,
  RISCO_ROTULO,
  chegouAgora,
  type Capacidades,
  type Demanda,
  type SinaisUteis,
} from "@/domain/demand";

/**
 * A linha de demanda. Consome `Demanda` do domínio e nada mais — não sabe se
 * veio de um quadro ou da tabela de tickets.
 *
 * É o átomo compartilhado por Lista, Sprint e Timeline: as três renderizam
 * esta mesma linha e mudam apenas o agrupamento. Nenhuma tem componente
 * próprio, e por isso não podem divergir.
 *
 * `capacidades` decide o que aparece. Numa fonte sem SLA a coluna não é
 * desenhada — em vez de mostrar um traço, que o usuário leria como "sem SLA
 * definido" quando na verdade é "esta fonte não tem SLA".
 */

const COR_RISCO: Record<string, string> = {
  sla_estourado: "bg-destructive",
  atrasada: "bg-destructive",
  vence_hoje: "bg-warning",
  sla_atencao: "bg-warning",
  parada: "bg-warning/60",
  vence_em_breve: "bg-info",
};

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatarIdade(dias: number): string {
  if (dias < 1) return "hoje";
  if (dias === 1) return "1d";
  if (dias < 30) return `${dias}d`;
  return `${Math.floor(dias / 30)}m`;
}

interface Props {
  demanda: Demanda;
  capacidades: Capacidades;
  /**
   * O que distingue as demandas deste recorte. Um sinal igual em todas as
   * linhas vira textura: ocupa espaço, não ajuda a escolher.
   */
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  /** Na Lista o status já é o grupo; em Sprint/Timeline ele volta para a linha. */
  mostrarStatus?: boolean;
}

function DemandaRowImpl({ demanda: d, capacidades, sinais, onAbrir, mostrarStatus }: Props) {
  const responsavel = d.responsaveis[0];

  const meta = [
    mostrarStatus ? d.status.rotulo : null,
    sinais.sistema ? (d.sistema?.nome ?? null) : null,
    capacidades.tipo && d.tipo ? d.tipo.replace(/_/g, " ") : null,
    sinais.prioridade && d.prioridade ? PRIORIDADE_ROTULO[d.prioridade] : null,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={() => onAbrir(d.id)}
      aria-label={`Abrir demanda ${d.titulo}`}
      className={cn(
        "group grid w-full grid-cols-[3px_1fr_auto] items-center gap-3 rounded-md py-1.5 pr-2",
        "text-left transition-colors duration-fast ease-standard hover:bg-muted/40",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        d.concluida && "opacity-55",
      )}
    >
      {/* Risco como 3px no início da linha: comunica sem roubar largura do título. */}
      <span
        aria-hidden
        className={cn("h-6 w-[3px] rounded-full", d.risco ? COR_RISCO[d.risco] : "bg-transparent")}
        title={d.risco ? RISCO_ROTULO[d.risco] : undefined}
      />

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {capacidades.etiquetas && sinais.etiquetas && d.etiquetas.length > 0 && (
            <span className="flex shrink-0 gap-0.5" aria-hidden>
              {d.etiquetas.slice(0, 3).map((e) => (
                <span
                  key={e.id}
                  className="h-3 w-[2px] rounded-full"
                  style={{ backgroundColor: e.cor ?? undefined }}
                  title={e.nome}
                />
              ))}
            </span>
          )}
          <span className={cn("ds-body-strong truncate", d.concluida && "line-through")}>{d.titulo}</span>
          {capacidades.ia && d.ia && (
            <Sparkles
              className="size-3.5 shrink-0 text-primary"
              aria-label="Atendida pela IA"
              // A IA não tem botão nem rótulo: tem um símbolo, sempre no mesmo lugar.
            />
          )}
          {/* "Nova" vem antes do risco porque responde a outra pergunta: risco
              diz o que pode dar errado, nova diz que ninguém viu ainda. Quando
              as duas valem, a segunda é a que muda o que fazer agora. */}
          {chegouAgora(d) && (
            <span className="ds-caption shrink-0 font-medium text-primary">· Nova</span>
          )}
          {d.risco && (
            <span className="ds-caption shrink-0 text-muted-foreground">· {RISCO_ROTULO[d.risco]}</span>
          )}
        </span>

        <span className="ds-caption flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
          {/* O hash só aparece quando o título não traz um código próprio.
              Dois identificadores competindo é pior que um só. */}
          {sinais.referencia && <span className="tabular-nums">{d.referencia}</span>}
          {sinais.referencia && meta.length > 0 && <span aria-hidden>·</span>}
          <span className="truncate">{meta.join(" · ")}</span>
        </span>
      </span>

      <span className="ds-caption flex shrink-0 items-center gap-3 text-muted-foreground">
        <span className="hidden items-center gap-2 opacity-0 transition-opacity duration-fast group-hover:opacity-100 sm:flex">
          {capacidades.progresso && d.progresso && (
            <span className="inline-flex items-center gap-1 tabular-nums" title="Checklist">
              <ListChecks className="size-3.5" aria-hidden />
              {d.progresso.feitos}/{d.progresso.total}
            </span>
          )}
          {capacidades.comentarios && d.comentarios !== null && d.comentarios > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums" title="Comentários">
              <MessageSquare className="size-3.5" aria-hidden />
              {d.comentarios}
            </span>
          )}
          {d.anexos !== null && d.anexos > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums" title="Anexos">
              <Paperclip className="size-3.5" aria-hidden />
              {d.anexos}
            </span>
          )}
        </span>

        {capacidades.progresso && sinais.progresso && d.progresso && (
          <span className="hidden w-10 text-right tabular-nums md:inline">{d.progresso.percentual}%</span>
        )}

        {sinais.prazo && (capacidades.prazo || capacidades.sla) && (
          <span className="hidden w-14 text-right tabular-nums md:inline" title="Prazo">
            {formatarData(d.prazo)}
          </span>
        )}

        <span
          className={cn("w-10 text-right tabular-nums", d.risco === "parada" && "text-warning")}
          title={`Última movimentação há ${d.diasParada} dia(s)`}
        >
          {formatarIdade(d.diasParada)}
        </span>

        {responsavel ? (
          <Avatar className="size-5" title={d.responsaveis.map((p) => p.nome).join(", ")}>
            {responsavel.avatarUrl && <AvatarImage src={responsavel.avatarUrl} alt={responsavel.nome} />}
            <AvatarFallback className="bg-muted text-[9px]">{iniciais(responsavel.nome)}</AvatarFallback>
          </Avatar>
        ) : (
          <span
            className="size-5 rounded-full border border-dashed border-border"
            aria-label="Sem responsável"
            title="Sem responsável"
          />
        )}
      </span>
    </button>
  );
}

export const DemandaRow = memo(DemandaRowImpl);
