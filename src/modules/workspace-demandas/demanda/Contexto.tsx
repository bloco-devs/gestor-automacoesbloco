import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  className,
}: {
  demanda: Demanda;
  capacidades: Capacidades;
  eventos: Evento[];
  className?: string;
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
      <dl className="px-4 py-2">
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

    </aside>
  );
}

export const Contexto = memo(ContextoImpl);
