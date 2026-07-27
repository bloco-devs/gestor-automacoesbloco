import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  COMPLEXIDADE_ROTULO,
  PRIORIDADE_ROTULO,
  TIPO_ROTULO,
  participantes,
  type Capacidades,
  type Demanda,
  type Evento,
} from "@/domain/demand";

/**
 * A coluna da esquerda — quem, o quê, quando.
 *
 * O QUE ELA NÃO É
 * Não é uma lista de todos os campos da tabela. É a resposta a "com que eu
 * estou lidando?", e por isso cada linha só aparece quando a fonte sabe
 * respondê-la (`capacidades`) e quando há resposta. Campo vazio com traço
 * ensina que o dado não foi preenchido; campo ausente é honesto sobre o que a
 * fonte não tem.
 *
 * A auditoria completa NÃO mora aqui: ela vive no fio, junto com as falas,
 * porque quem acompanha quer a história em ordem, não duas listas paralelas.
 * O que sobra à esquerda é o estado atual — o retrato, não o filme.
 */

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function data(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <dt className="w-24 shrink-0 text-[12px] text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 flex-1 text-[13px]">{children}</dd>
    </div>
  );
}

function Gente({ pessoas }: { pessoas: { id: string; nome: string; avatarUrl: string | null }[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {pessoas.map((p) => (
        <span key={p.id} className="inline-flex items-center gap-1.5">
          <Avatar className="size-4">
            {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
            <AvatarFallback className="bg-muted text-[8px]">{iniciais(p.nome)}</AvatarFallback>
          </Avatar>
          {p.nome}
        </span>
      ))}
    </span>
  );
}

function ContextoImpl({
  demanda: d,
  capacidades,
  eventos,
  checklist,
  className,
}: {
  demanda: Demanda;
  capacidades: Capacidades;
  eventos: Evento[];
  /** A definição de pronto vem antes dos metadados: ela é o trabalho. */
  checklist?: React.ReactNode;
  className?: string;
}) {
  const gente = participantes(eventos);

  return (
    <aside aria-label="Contexto da demanda" className={className}>
      {checklist}
      <dl className="px-4 py-3">
        <Linha rotulo="Status">{d.status.rotulo}</Linha>
        {capacidades.tipo && d.tipo && <Linha rotulo="Tipo">{TIPO_ROTULO[d.tipo]}</Linha>}
        {d.prioridade && <Linha rotulo="Prioridade">{PRIORIDADE_ROTULO[d.prioridade]}</Linha>}
        {capacidades.complexidade && d.complexidade && (
          <Linha rotulo="Complexidade">{COMPLEXIDADE_ROTULO[d.complexidade]}</Linha>
        )}
        {d.sistema && <Linha rotulo="Sistema">{d.sistema.nome}</Linha>}

        <Linha rotulo="Responsável">
          {d.responsaveis.length > 0 ? (
            <Gente pessoas={d.responsaveis} />
          ) : (
            <span className="text-muted-foreground">Ninguém ainda</span>
          )}
        </Linha>
        {d.autor && <Linha rotulo="Aberta por"><Gente pessoas={[d.autor]} /></Linha>}
        <Linha rotulo="Aberta em">{data(d.criadaEm)}</Linha>
        {capacidades.prazo && d.prazo && <Linha rotulo="Prazo">{data(d.prazo)}</Linha>}

        {gente.length > 0 && (
          <Linha rotulo="Participando">
            <Gente pessoas={gente} />
          </Linha>
        )}

        {capacidades.etiquetas && d.etiquetas.length > 0 && (
          <Linha rotulo="Etiquetas">
            <span className="flex flex-wrap gap-1">
              {d.etiquetas.map((e) => (
                <span
                  key={e.id}
                  className="rounded px-1.5 py-0.5 text-[11px]"
                  style={e.cor ? { backgroundColor: `${e.cor}22`, color: e.cor } : undefined}
                >
                  {e.nome}
                </span>
              ))}
            </span>
          </Linha>
        )}
      </dl>

      {d.descricao && (
        <div className="border-t border-border/50 px-4 py-3">
          <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">Descrição</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">{d.descricao}</p>
        </div>
      )}
    </aside>
  );
}

export const Contexto = memo(ContextoImpl);
