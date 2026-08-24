import { memo } from "react";
import { Sparkles, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  COMPLEXIDADE_ROTULO,
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

/**
 * RÓTULO E VALOR PRECISAM PESAR DIFERENTE
 *
 * Antes os dois vinham quase no mesmo tom e tamanho, empilhados a cada 6px.
 * O olho lia uma parede cinza e tinha que percorrer item por item para achar
 * "Responsável" — quando a informação que importa é sempre a da direita.
 *
 * Agora o rótulo recua (menor, mais claro, em caixa alta discreta) e o valor
 * ganha o peso do texto normal. A leitura passa a ser vertical pela coluna
 * dos valores, com os rótulos servindo de referência quando se procura algo
 * específico. Mais respiro entre linhas para os valores longos (nomes
 * completos, datas por extenso) não colarem no de baixo.
 */
function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-2">
      <dt className="w-[5.5rem] shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground/80">
        {rotulo}
      </dt>
      <dd className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

/**
 * O bloco de gente. Quando `onRemover` existe, cada pessoa ganha um "x" que
 * só aparece no hover — a linha continua sendo leitura, e a ação fica onde o
 * olho já está, sem competir com o nome.
 */
function Gente({
  pessoas,
  onRemover,
  removendo,
}: {
  pessoas: { id: string; nome: string; avatarUrl: string | null; sistema?: boolean }[];
  onRemover?: (pessoaId: string) => void;
  removendo?: boolean;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {pessoas.map((p) => (
        <span key={p.id} className="group/resp inline-flex items-center gap-1.5">
          {/* O Blink não tem foto, e a inicial "B" o fazia parecer um colega
              chamado Bruno. Um símbolo na cor da marca diz o que ele é sem
              precisar de legenda — e o assistente é a única coisa nesta lista
              que não é uma pessoa. */}
          {p.sistema ? (
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center rounded-full bg-primary/20 text-primary"
            >
              <Sparkles className="size-2.5" />
            </span>
          ) : (
            <Avatar className="size-4">
              {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
              <AvatarFallback className="bg-muted text-[8px]">{iniciais(p.nome)}</AvatarFallback>
            </Avatar>
          )}
          {p.nome}
          {onRemover && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={removendo}
                  aria-label="Remover atribuição"
                  onClick={() => onRemover(p.id)}
                  className={cn(
                    "grid size-4 place-items-center rounded-full text-muted-foreground",
                    "opacity-0 transition-opacity group-hover/resp:opacity-100 focus-visible:opacity-100",
                    "hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    "disabled:cursor-progress",
                  )}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Remover atribuição</TooltipContent>
            </Tooltip>
          )}
        </span>
      ))}
    </span>
  );
}

function ContextoImpl({
  demanda: d,
  capacidades,
  eventos,
  className,
  onRemoverResponsavel,
  removendoResponsavel,
}: {
  demanda: Demanda;
  capacidades: Capacidades;
  eventos: Evento[];
  className?: string;
  /** Sem este callback o responsável é só leitura — a tela decide se pode escrever. */
  onRemoverResponsavel?: (pessoaId: string) => void;
  removendoResponsavel?: boolean;
}) {
  const gente = participantes(eventos);

  return (
    <aside aria-label="Detalhes da demanda" className={className}>
      {/*
        O QUE SAIU DAQUI, E POR QUE
        Status, Tipo e Prioridade apareciam neste painel E no cabeçalho da
        tela. Não era redundância útil: era a mesma informação em dois lugares,
        ensinando a pessoa a não confiar em nenhum dos dois quando eles
        divergissem — e eles divergiram.

        A descrição saiu para o fio. Ela é literalmente o que o solicitante
        disse; ficar num painel à parte obrigava a cruzar duas leituras para
        entender uma conversa que começava pela metade.

        Sobrou o que de fato é consulta: quem, quando, onde.
      */}
      {/* Superfície própria, como os cartões do painel do Blink: o retrato da
          demanda é um assunto fechado, e não a continuação da tela em volta. */}
      <dl className="m-4 rounded-xl border border-border/50 bg-card p-4 shadow-sm">

        {capacidades.complexidade && d.complexidade && (
          <Linha rotulo="Complexidade">{COMPLEXIDADE_ROTULO[d.complexidade]}</Linha>
        )}
        {d.sistema && <Linha rotulo="Sistema">{d.sistema.nome}</Linha>}

        <Linha rotulo="Responsável">
          {d.responsaveis.length > 0 ? (
            <Gente
              pessoas={d.responsaveis}
              onRemover={onRemoverResponsavel}
              removendo={removendoResponsavel}
            />
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

    </aside>
  );
}

export const Contexto = memo(ContextoImpl);
