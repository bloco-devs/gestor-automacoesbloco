import { memo, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Scale,
} from "lucide-react";
import { EmptyPanel, KpiRow, PageHeader, PageShell, Section, StatCard } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  buscarHistoricoDeClassificacao,
  buscarParaClassificar,
  classificar,
  formatarDuracao,
  type ParaClassificar,
} from "../services/fechamento-data";
import { buscarTiposDeClassificacao } from "../services/relatorios-data";
import { formatarData } from "../services/relatorios-service";

/**
 * O texto que fica na tela de quem decide.
 *
 * Não é decoração: a regra veio do RH em 21/08 e é contraintuitiva o
 * suficiente para precisar estar escrita onde a decisão acontece. Uma entrega
 * feita em vinte minutos com ajuda de IA pode ser Difícil, e o sistema não vai
 * lembrar disso sozinho — quem classifica precisa ler.
 */
const CRITERIO =
  "Considere escopo, complexidade técnica, impacto, risco, componentes afetados, integrações, alterações de banco, segurança e testes. O tempo aparece abaixo como contexto — ele não define a classificação, e usar IA ou automação não torna uma entrega complexa mais fácil.";

function Cartao({
  item,
  tipos,
  aoClassificar,
  salvando,
}: {
  item: ParaClassificar;
  tipos: Array<{ codigo: string; rotulo: string; pontos: number }>;
  aoClassificar: (codigo: string, justificativa: string, motivo?: string) => void;
  salvando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [motivo, setMotivo] = useState("");
  const [verHistorico, setVerHistorico] = useState(false);

  const historico = useQuery({
    queryKey: ["relatorio", "historico-classificacao", item.demanda_id],
    queryFn: () => buscarHistoricoDeClassificacao(item.demanda_id),
    enabled: verHistorico,
  });

  const curta = justificativa.trim().length < 15;
  const precisaMotivo = item.ja_classificada && motivo.trim().length < 10;

  return (
    <div className="rounded-2xl border">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {aberto ? (
          <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] text-muted-foreground">{item.ticket_code}</span>
            <span className="ds-h3">{item.titulo}</span>
          </div>
          <div className="ds-caption mt-1 flex flex-wrap gap-x-4 text-muted-foreground">
            <span>{item.sistema_slug ?? "sem sistema"}</span>
            <span>{item.responsavel_nome ?? "sem responsável"}</span>
            <span>concluída em {formatarData(item.concluida_em)}</span>
            {item.minutos_lancados > 0 && (
              <span>{formatarDuracao(item.minutos_lancados)} lançados</span>
            )}
          </div>
        </div>
        {item.ja_classificada ? (
          <Badge className="shrink-0 font-normal">classificada</Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 font-normal">
            aguardando
          </Badge>
        )}
      </button>

      {aberto && (
        <div className="flex flex-col gap-4 border-t p-4">
          {/* O relato, para quem classifica ler antes de decidir. */}
          <div className="flex flex-col gap-3 text-[13px]">
            {[
              ["Problema", item.problema],
              ["Solução", item.solucao],
              ["O que foi alterado", item.alterado],
              ["Resultado", item.resultado],
              ["Testes", item.testes],
            ].map(([rotulo, texto]) => (
              <div key={rotulo as string}>
                <span className="ds-label text-muted-foreground">{rotulo}</span>
                <p className="mt-0.5 whitespace-pre-wrap">
                  {(texto as string | null)?.trim() || (
                    <span className="text-muted-foreground">Não informado.</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-muted/40 p-3 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {item.minutos_lancados > 0
                ? formatarDuracao(item.minutos_lancados)
                : "sem tempo lançado"}
            </span>
            <span>
              {item.tarefas_total > 0
                ? `${item.tarefas_feitas}/${item.tarefas_total} critérios`
                : "sem critérios"}
            </span>
            <span>{item.anexos} anexo{item.anexos === 1 ? "" : "s"}</span>
          </div>

          {/* --------------------------------------------------------- */}
          <div>
            <Label>Classificação</Label>
            <p className="ds-caption mb-2 mt-0.5 text-muted-foreground">{CRITERIO}</p>
            <div className="flex flex-wrap gap-2">
              {tipos.map((t) => (
                <button
                  key={t.codigo}
                  type="button"
                  onClick={() => setEscolha(t.codigo)}
                  className={[
                    "rounded-lg border px-4 py-2 text-[13px] transition-colors",
                    escolha === t.codigo
                      ? "border-foreground bg-foreground text-background"
                      : "hover:bg-accent",
                  ].join(" ")}
                >
                  {t.rotulo} — {t.pontos} pontos
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>
              Justificativa <span className="text-[11px] font-normal">obrigatória</span>
            </Label>
            <Textarea
              rows={3}
              className="mt-1.5"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que o escopo, o impacto ou o risco levam a esta classificação."
            />
            {justificativa.length > 0 && curta && (
              <p className="ds-caption mt-1 text-muted-foreground">
                Faltam {15 - justificativa.trim().length} caracteres.
              </p>
            )}
          </div>

          {item.ja_classificada && (
            <div>
              <Label>
                Motivo da mudança <span className="text-[11px] font-normal">obrigatório</span>
              </Label>
              <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">
                Esta entrega já está classificada. A justificativa diz por que é a nova; o motivo
                diz o que mudou no entendimento.
              </p>
              <Textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="O que passou a ser considerado que antes não era."
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!escolha || curta || precisaMotivo || salvando}
              onClick={() => aoClassificar(escolha!, justificativa, motivo || undefined)}
            >
              <Scale className="size-4" aria-hidden />
              {item.ja_classificada ? "Alterar classificação" : "Classificar"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setVerHistorico((v) => !v)}>
              <History className="size-4" aria-hidden />
              Histórico
            </Button>
          </div>

          {verHistorico && (
            <div className="rounded-lg border">
              {historico.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (historico.data ?? []).length === 0 ? (
                <p className="p-3 text-[13px] text-muted-foreground">
                  Nenhuma classificação registrada ainda.
                </p>
              ) : (
                <div className="divide-y">
                  {(historico.data ?? []).map((h) => (
                    <div key={h.id} className="p-3 text-[13px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-normal">
                          {h.origem === "definicao" ? "definida" : "alterada"}
                        </Badge>
                        <span>
                          {h.classificacao_de
                            ? `${h.classificacao_de} (${h.pontos_de}) → ${h.classificacao_para} (${h.pontos_para})`
                            : `${h.classificacao_para} — ${h.pontos_para} pontos`}
                        </span>
                        <span className="ml-auto text-muted-foreground">
                          {formatarData(h.alterado_em, true)}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{h.justificativa}</p>
                      {h.motivo_da_alteracao && (
                        <p className="mt-1">
                          <span className="ds-label text-muted-foreground">Motivo: </span>
                          {h.motivo_da_alteracao}
                        </p>
                      )}
                      {h.alterado_por_email && (
                        <p className="ds-caption mt-1 text-muted-foreground">
                          por {h.alterado_por_email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClassificacaoImpl() {
  const qc = useQueryClient();
  const [aba, setAba] = useState<"aguardando" | "classificadas">("aguardando");

  const tipos = useQuery({
    queryKey: ["relatorio", "tipos-classificacao"],
    queryFn: buscarTiposDeClassificacao,
    staleTime: 300_000,
  });

  const lista = useQuery({
    queryKey: ["relatorio", "para-classificar"],
    queryFn: buscarParaClassificar,
    staleTime: 30_000,
  });

  const acao = useMutation({
    mutationFn: (v: {
      demanda: string;
      codigo: string;
      justificativa: string;
      motivo?: string;
    }) => classificar(v.demanda, v.codigo, v.justificativa, v.motivo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["relatorio"] });
      toast.success("Classificação registrada");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível classificar", { description: e.message }),
  });

  const todas = lista.data ?? [];
  const aguardando = useMemo(() => todas.filter((i) => !i.ja_classificada), [todas]);
  const classificadas = useMemo(() => todas.filter((i) => i.ja_classificada), [todas]);
  const visiveis = aba === "aguardando" ? aguardando : classificadas;

  return (
    <PageShell maxWidth="xl">
      <PageHeader
        title="Classificação"
        subtitle="Fácil, Médio ou Difícil, decidido por gente. O tempo entra como contexto — nunca como fórmula."
        icon={<Scale className="size-6" aria-hidden />}
      />

      <Section title="Situação">
        <KpiRow>
          <StatCard label="Aguardando classificação" value={aguardando.length} icon={Scale} />
          <StatCard
            label="Já classificadas"
            value={classificadas.length}
            icon={CheckCircle2}
            tone={classificadas.length > 0 ? "success" : "neutral"}
          />
          {/* Não somo pontos aqui: esta consulta não devolve a classificação
              de cada linha, só se ela existe. Somar exigiria adivinhar, e o
              total correto está na apuração do ciclo. */}
          <StatCard
            label="Sem tempo lançado"
            value={todas.filter((i) => i.minutos_lancados === 0).length}
            icon={Clock}
            hint="não impede classificar — é só contexto a menos"
          />
        </KpiRow>
      </Section>

      <div className="flex gap-1 border-b">
        {([
          ["aguardando", `Aguardando (${aguardando.length})`],
          ["classificadas", `Classificadas (${classificadas.length})`],
        ] as const).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            onClick={() => setAba(chave)}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              aba === chave
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <Section title="">
        {lista.error ? (
          <EmptyPanel
            icon={AlertTriangle}
            title="Não foi possível carregar"
            description={(lista.error as Error).message}
          />
        ) : lista.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <EmptyPanel
            icon={Scale}
            title={
              aba === "aguardando"
                ? "Nada aguardando classificação"
                : "Nenhuma classificada ainda"
            }
            description={
              aba === "aguardando"
                ? "Só aparecem aqui as entregas com fechamento técnico registrado. Veja a fila de pendências para as que ainda faltam."
                : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {visiveis.map((item) => (
              <Cartao
                key={item.demanda_id}
                item={item}
                tipos={tipos.data ?? []}
                salvando={acao.isPending}
                aoClassificar={(codigo, justificativa, motivo) =>
                  acao.mutate({ demanda: item.demanda_id, codigo, justificativa, motivo })
                }
              />
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}

export default memo(ClassificacaoImpl);
export { ClassificacaoImpl as Classificacao };
