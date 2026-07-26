import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDemanda, type Escopo } from "@/modules/demand-access";
import {
  COMPLEXIDADE_ROTULO,
  PRIORIDADE_ROTULO,
  RISCO_ROTULO,
  TIPO_ROTULO,
  type Capacidades,
  type Demanda,
} from "@/domain/demand";

/**
 * `/demandas/:id` — a demanda ganha endereço próprio.
 *
 * ESTA É A MUDANÇA ESTRUTURAL, NÃO A VISUAL.
 * Até aqui o detalhe vivia dentro de `<Dialog>`: não tinha URL, não dava para
 * colar um link no Slack, não abria em nova aba e não voltava com o botão de
 * voltar. Num Help Desk, o link do ticket é a unidade de comunicação da empresa
 * — sem ele o produto não é um Help Desk.
 *
 * O layout aqui é deliberadamente simples: as três colunas do Zendesk
 * (contexto | conversa | copiloto) vêm na etapa de redesign. O que esta rota
 * garante é que, quando vierem, elas terão onde morar — e que a conversa e a
 * auditoria possam ser plugadas sem mexer em navegação de novo.
 *
 * Como todo o resto do módulo, este componente só conhece `Demanda`.
 */

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function Propriedade({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <dt className="ds-caption w-28 shrink-0 text-muted-foreground">{rotulo}</dt>
      <dd className="ds-caption min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function Propriedades({ demanda: d, capacidades }: { demanda: Demanda; capacidades: Capacidades }) {
  return (
    <dl className="divide-y divide-border/40">
      <Propriedade rotulo="Status">{d.status.rotulo}</Propriedade>
      <Propriedade rotulo="Responsável">
        {d.responsaveis.length > 0 ? (
          <span className="flex flex-wrap items-center gap-2">
            {d.responsaveis.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5">
                <Avatar className="size-5">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.nome} />}
                  <AvatarFallback className="bg-muted text-[9px]">{iniciais(p.nome)}</AvatarFallback>
                </Avatar>
                {p.nome}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">Sem responsável</span>
        )}
      </Propriedade>

      <Propriedade rotulo="Prioridade">
        {d.prioridade ? PRIORIDADE_ROTULO[d.prioridade] : <span className="text-muted-foreground">—</span>}
      </Propriedade>

      {/* Campos que só existem quando a fonte os tem. Numa fonte sem tipo, a
          linha não aparece — em vez de mostrar um traço, que seria lido como
          "não preenchido" quando na verdade é "não existe aqui". */}
      {capacidades.tipo && (
        <Propriedade rotulo="Tipo">
          {d.tipo ? TIPO_ROTULO[d.tipo] : <span className="text-muted-foreground">—</span>}
        </Propriedade>
      )}
      {capacidades.complexidade && (
        <Propriedade rotulo="Complexidade">
          {d.complexidade ? COMPLEXIDADE_ROTULO[d.complexidade] : <span className="text-muted-foreground">—</span>}
        </Propriedade>
      )}

      <Propriedade rotulo="Sistema">
        {d.sistema?.nome ?? <span className="text-muted-foreground">—</span>}
      </Propriedade>

      {(capacidades.prazo || capacidades.sla) && (
        <Propriedade rotulo="Prazo">
          {d.prazo ? new Date(d.prazo).toLocaleDateString("pt-BR") : <span className="text-muted-foreground">—</span>}
        </Propriedade>
      )}

      {capacidades.sla && d.sla && (
        <Propriedade rotulo="SLA">
          {d.sla.estado.replace(/_/g, " ")}
          {d.sla.venceEm && ` · vence ${new Date(d.sla.venceEm).toLocaleDateString("pt-BR")}`}
        </Propriedade>
      )}

      {capacidades.progresso && d.progresso && (
        <Propriedade rotulo="Progresso">
          {d.progresso.feitos}/{d.progresso.total} · {d.progresso.percentual}%
        </Propriedade>
      )}

      {capacidades.etiquetas && d.etiquetas.length > 0 && (
        <Propriedade rotulo="Etiquetas">
          <span className="flex flex-wrap gap-1.5">
            {d.etiquetas.map((e) => (
              <span key={e.id} className="inline-flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: e.cor ?? undefined }}
                  aria-hidden
                />
                {e.nome}
              </span>
            ))}
          </span>
        </Propriedade>
      )}

      <Propriedade rotulo="Aberta em">
        {new Date(d.criadaEm).toLocaleDateString("pt-BR")}
        {d.autor && ` por ${d.autor.nome}`}
      </Propriedade>
      <Propriedade rotulo="Movimentada">
        {d.diasParada < 1 ? "hoje" : `há ${d.diasParada} dia${d.diasParada === 1 ? "" : "s"}`}
      </Propriedade>
    </dl>
  );
}

export default function DemandaDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const projetoId = params.get("projeto");

  const escopo: Escopo = useMemo(
    () => ({ tipo: "demanda", demandaId: id ?? "", projetoId: projetoId ?? undefined }),
    [id, projetoId],
  );

  const { demanda, capacidades, carregando } = useDemanda(escopo, id ?? null);

  if (carregando && !demanda) {
    return (
      <div className="flex h-full items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Carregando demanda…</span>
      </div>
    );
  }

  if (!demanda) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="ds-body-strong">Demanda não encontrada</p>
        <p className="ds-caption mt-1 text-muted-foreground">
          Ela pode ter sido removida, ou pertence a outro projeto.
        </p>
        <Button variant="outline" size="sm" className="mt-5" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-4xl px-5 py-6 md:px-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="ds-caption -ml-1 mb-5 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-muted-foreground transition-colors duration-fast hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Voltar
      </button>

      <header className="space-y-2">
        <div className="ds-caption flex items-center gap-2 text-muted-foreground">
          <span className="tabular-nums">{demanda.referencia}</span>
          <span aria-hidden>·</span>
          <span>{demanda.status.rotulo}</span>
          {demanda.risco && (
            <>
              <span aria-hidden>·</span>
              <span className="text-warning">{RISCO_ROTULO[demanda.risco]}</span>
            </>
          )}
          {capacidades.ia && demanda.ia && (
            <Sparkles className="size-3.5 text-primary" aria-label="Atendida pela IA" />
          )}
        </div>
        <h1 className="ds-h1">{demanda.titulo}</h1>
      </header>

      {demanda.descricao && (
        <section className="mt-6">
          <p className="ds-body whitespace-pre-wrap text-foreground/90">{demanda.descricao}</p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="ds-label mb-1 text-muted-foreground">Propriedades</h2>
        <Propriedades demanda={demanda} capacidades={capacidades} />
      </section>

      {/*
        Aqui entram, na etapa de redesign:
          coluna esquerda  histórico e workflow (demand_audit_logs)
          coluna central   conversa (demand_comments) com a resposta da IA no fio
          coluna direita   copiloto contextual da demanda
        Nenhuma delas exige tocar em rota de novo — só em layout.
      */}
    </article>
  );
}
