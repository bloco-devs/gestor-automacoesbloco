import { memo, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  CheckCircle2,
  Coins,
  FileText,
  Info,
  Lock,
  LockOpen,
  Scale,
  TriangleAlert,
} from "lucide-react";
import { exportarPdfExecutivo } from "../services/pdf-exporter";
import { formatarReferenciaComSigla, obterEstiloDoSistema } from "@/domain/demand";
import { cn } from "@/lib/utils";
import { EmptyPanel, PageHeader, PageShell, Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { toCsv, downloadCsv } from "@/modules/analytics/utils/csv";
import {
  buscarPendenciasDoCiclo,
  buscarResultadoDoCiclo,
  fecharCiclo,
  formatarPercentual,
  formatarReais,
  reabrirCiclo,
} from "../services/apuracao-data";
import {
  buscarApuracao,
  buscarCiclos,
  buscarFaixas,
  buscarImplementacoes,
  buscarMinhasCapacidades,
} from "../services/relatorios-data";
import MedidorDaMeta from "./MedidorDaMeta";
import { VoltarParaRelatorios } from "./VoltarParaRelatorios";
import { formatarData } from "../services/relatorios-service";
import { nomeCurto } from "../nomes";
import { formatarDuracao } from "../services/fechamento-data";

const TODOS = "__todos__";

function Apurar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [cicloId, setCicloId] = useState<string | null>(null);
  const [sistema, setSistema] = useState<string | null>(null);
  const [pessoa, setPessoa] = useState<string | null>(null);
  const [classificacao, setClassificacao] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [reabrindo, setReabrindo] = useState(false);

  const capacidades = useQuery({
    queryKey: ["relatorio", "minhas-capacidades"],
    queryFn: buscarMinhasCapacidades,
    staleTime: 60_000,
  });
  const podeAdministrar = (capacidades.data ?? []).includes("remuneracao.administrar");
  const vejoTodos = (capacidades.data ?? []).includes("remuneracao.ver_todas");

  const ciclos = useQuery({
    queryKey: ["relatorio", "ciclos"],
    queryFn: buscarCiclos,
    staleTime: 60_000,
  });

  // As faixas alimentam as marcas do medidor. Vêm do banco: se o RH mudar a
  // régua, o desenho muda com ela — nenhum limiar está no código da tela.
  const faixas = useQuery({
    queryKey: ["relatorio", "faixas"],
    queryFn: buscarFaixas,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!cicloId && ciclos.data?.length) setCicloId(ciclos.data[0].id);
  }, [ciclos.data, cicloId]);

  const ciclo = ciclos.data?.find((c) => c.id === cicloId) ?? null;

  const resultado = useQuery({
    queryKey: ["relatorio", "resultado-ciclo", cicloId],
    queryFn: () => buscarResultadoDoCiclo(cicloId!),
    enabled: !!cicloId,
  });

  const pendencias = useQuery({
    queryKey: ["relatorio", "pendencias-ciclo", cicloId],
    queryFn: () => buscarPendenciasDoCiclo(cicloId!),
    enabled: !!cicloId,
  });

  const porPessoa = useQuery({
    queryKey: ["relatorio", "apuracao-pessoas", cicloId],
    queryFn: () => buscarApuracao(cicloId!),
    enabled: !!cicloId,
  });

  // O detalhamento reusa a consulta do relatório técnico, restrita à janela do
  // ciclo. Não vale criar outra consulta para os mesmos dados.
  const detalhe = useQuery({
    queryKey: ["relatorio", "detalhe-ciclo", cicloId, sistema, pessoa, classificacao],
    queryFn: () =>
      buscarImplementacoes({
        inicio: new Date(ciclo!.inicio),
        fim: new Date(ciclo!.fim),
        sistema,
        responsavel: pessoa,
        classificacao,
      }),
    enabled: !!ciclo,
  });

  const fechar = useMutation({
    mutationFn: () => fecharCiclo(cicloId!),
    onSuccess: (n) => {
      void qc.invalidateQueries({ queryKey: ["relatorio"] });
      toast.success(`Ciclo fechado com ${n} entrega${n === 1 ? "" : "s"}`, {
        description: "O resultado ficou congelado. Reclassificar agora não altera este ciclo.",
      });
    },
    onError: (e: Error) => toast.error("Não foi possível fechar", { description: e.message }),
  });

  const reabrir = useMutation({
    mutationFn: () => reabrirCiclo(cicloId!, motivo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["relatorio"] });
      setReabrindo(false);
      setMotivo("");
      toast.success("Ciclo reaberto", { description: "O motivo ficou registrado no ciclo." });
    },
    onError: (e: Error) => toast.error("Não foi possível reabrir", { description: e.message }),
  });

  const r = resultado.data;
  const p = pendencias.data;
  // `?? []` cria array novo a cada render, o que anula o useMemo abaixo.
  // Estabilizar aqui é o que faz a memoização valer alguma coisa.
  const pessoas = useMemo(() => porPessoa.data ?? [], [porPessoa.data]);
  const linhas = useMemo(() => detalhe.data ?? [], [detalhe.data]);

  const sistemasDoCiclo = useMemo(
    () => [...new Set(linhas.map((l) => l.sistema_slug).filter(Boolean))] as string[],
    [linhas],
  );

  function exportar() {
    downloadCsv(
      `apuracao-${r?.ciclo_rotulo?.replace("/", "-") ?? "ciclo"}.csv`,
      toCsv(
        linhas.map((l) => ({
          Demanda: l.ticket_code,
          Título: l.titulo,
          Sistema: l.sistema_slug ?? "Não identificado",
          Responsável: l.responsavel_nome ?? "—",
          Conclusão: formatarData(l.concluida_em),
          Classificação: l.classificacao_rotulo ?? "Não classificada",
          Pontos: l.pontos ?? "",
          Justificativa: l.justificativa ?? "",
          "Fechamento técnico": l.fechamento === "concluido" ? "Registrado" : "Pendente",
        })),
      ),
    );
  }

  if (ciclos.isLoading) {
    return (
      <PageShell>
        <PageHeader title="Apuração" icon={<Coins className="size-6" aria-hidden />} />
        <Skeleton className="h-32 w-full" />
      </PageShell>
    );
  }

  if (resultado.error) {
    return (
      <PageShell>
        <PageHeader title="Apuração" icon={<Coins className="size-6" aria-hidden />} />
        <EmptyPanel
          icon={Lock}
          title="Sem acesso à apuração"
          description={(resultado.error as Error).message}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumb={<VoltarParaRelatorios />}
        title="Apuração da remuneração variável"
        /**
         * As datas REAIS do ciclo escolhido, não uma regra genérica.
         *
         * Dizia "Ciclo do dia 20 ao dia 19", o que ensinava ao RH que a
         * empresa tem uma regra permanente de dia 20. Não tem: aquele é o
         * período que o RH definiu para a primeira apuração, porque a folha de
         * agosto já estava fechada. No dia em que ele criar 01/09 → 30/09, o
         * texto fixo estaria mentindo — este acompanha.
         */
        subtitle={
          resultado.data
            ? `Produção de ${formatarData(resultado.data.inicio)} a ${formatarData(
                new Date(new Date(resultado.data.fim).getTime() - 1000).toISOString(),
              )}`
            : "Período definido no ciclo"
        }
        icon={<Coins className="size-6" aria-hidden />}
        actions={
          <div className="flex flex-wrap gap-2">
            {(ciclos.data ?? []).length > 1 && (
              <Select value={cicloId ?? ""} onValueChange={setCicloId}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(ciclos.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/relatorios/executivo")}
            >
              <FileText className="mr-1.5 size-4" /> Relatório Executivo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (r) {
                  exportarPdfExecutivo({
                    resultado: r,
                    pessoas,
                    atividades: linhas,
                    pendencias: p,
                  });
                }
              }}
              disabled={!r}
            >
              <Coins className="mr-1.5 size-4" /> PDF Oficial
            </Button>
            <Button variant="outline" size="sm" onClick={exportar} disabled={linhas.length === 0}>
              CSV
            </Button>
          </div>
        }
      />

      {/* ============================================================
          A PERGUNTA 1: QUANTOS PONTOS A EQUIPE FEZ, E QUANTO FALTA?

          Antes eram quatro números do mesmo tamanho e o leitor dividia de
          cabeça. Agora o medidor mostra a régua inteira: onde a equipe está,
          onde ficam os degraus e quanto cada um paga.
          ============================================================ */}
      {resultado.isLoading || !r ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <MedidorDaMeta
            rotulo={r.ciclo_rotulo}
            periodo={`${formatarData(r.inicio)} a ${formatarData(
              new Date(new Date(r.fim).getTime() - 1).toISOString(),
            )}`}
            situacao={
              <div className="flex items-center gap-2">
                <Badge variant={r.congelado ? "default" : "outline"} className="font-normal">
                  {r.situacao === "aberto" ? "aberto" :
                   r.situacao === "em_analise" ? "em apuração" :
                   r.situacao === "fechado" ? "fechado" : "aprovado"}
                </Badge>
                {r.congelado && (
                  <span className="ds-caption inline-flex items-center gap-1 text-muted-foreground">
                    <Lock className="size-3" aria-hidden />
                    congelado
                  </span>
                )}
              </div>
            }
            pontos={r.pontos}
            meta={r.meta_pontos}
            percentual={r.percentual}
            faixas={faixas.data ?? []}
            indefinida={r.faixa_indefinida}
            faixaRotulo={r.faixa_rotulo}
            valorReais={r.valor_reais}
          />

          {/* A composição só aparece quando existe ponto — três linhas de
              "0 × 50 = 0" ocupam a tela sem informar. */}
          {r.pontos > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
              {[
                ["Fácil", r.facil, 50],
                ["Médio", r.media, 100],
                ["Difícil", r.dificil, 200],
              ]
                .filter(([, q]) => (q as number) > 0)
                .map(([rot, q, v]) => (
                  <span key={rot as string}>
                    <span className="text-muted-foreground">{rot}:</span> {q} × {v} ={" "}
                    <span className="font-medium tabular-nums">
                      {(q as number) * (v as number)}
                    </span>
                  </span>
                ))}
            </div>
          )}
        </>
      )}

      {/* ============================================================
          POR QUE O NÚMERO NÃO FECHA COM O TOTAL DE CONCLUÍDAS
          ============================================================ */}
      {p && p.concluidas_no_ciclo > p.elegiveis && (
        <Section title={p.elegiveis === 0 ? "O que falta para apurar" : "Pendências do ciclo"}>
          <div
            className={[
              "rounded-lg border p-4",
              // Quando NADA foi apurado, isto deixa de ser nota de rodapé e
              // passa a ser a única coisa a fazer na tela.
              p.elegiveis === 0
                ? "border-warning/40 bg-warning/10"
                : "bg-muted/40",
            ].join(" ")}
          >
            <div className="flex items-start gap-2.5">
              {p.elegiveis === 0 ? (
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="flex-1 text-[13px]">
                <p className="font-medium">
                  {p.elegiveis === 0
                    ? `${p.concluidas_no_ciclo} entregas concluídas, nenhuma apurada ainda`
                    : `${p.concluidas_no_ciclo} concluídas, ${p.elegiveis} apuradas`}
                </p>

                {/* AS QUATRO CATEGORIAS, SEMPRE, INCLUSIVE AS ZERADAS.
                    Esconder a linha zerada pouparia espaço e tiraria a única
                    coisa que dá ao RH confiança no número: poder somar com o
                    dedo e bater com o total. Antes as categorias podiam se
                    sobrepor — uma demanda sem relato E sem data confiável era
                    contada duas vezes — e a soma não fechava. Corrigido no
                    banco em 20260825140000; aqui a soma fica exposta. */}
                <div className="mt-3 flex flex-col gap-1 tabular-nums">
                  {(
                    [
                      ["Elegíveis — entram na apuração", p.elegiveis],
                      ["Sem relato técnico", p.sem_fechamento],
                      ["Com relato, sem classificação", p.sem_classificacao],
                      ["Sem data de conclusão confirmável", p.sem_data_confiavel],
                    ] as Array<[string, number]>
                  ).map(([rotulo, n]) => (
                    <div key={rotulo} className="flex items-baseline justify-between gap-4">
                      <span className={n === 0 ? "text-muted-foreground" : ""}>{rotulo}</span>
                      <span className={n === 0 ? "text-muted-foreground" : "font-medium"}>{n}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex items-baseline justify-between gap-4 border-t pt-1">
                    <span className="text-muted-foreground">Concluídas no período</span>
                    <span className="font-medium">{p.concluidas_no_ciclo}</span>
                  </div>
                </div>

                {p.elegiveis + p.sem_fechamento + p.sem_classificacao + p.sem_data_confiavel !==
                  p.concluidas_no_ciclo && (
                  <p className="mt-2 text-destructive">
                    As categorias não somam o total. Isso é defeito de consulta, não do seu ciclo —
                    avise o time técnico antes de fechar.
                  </p>
                )}

                {p.com_fechamento > 0 && p.com_fechamento < p.concluidas_no_ciclo && (
                  <p className="mt-2 text-muted-foreground">
                    {p.com_fechamento} de {p.concluidas_no_ciclo} já têm relato técnico registrado
                    {p.classificadas > 0 ? `, e ${p.classificadas} já foram classificadas` : ""}.
                  </p>
                )}

                <p className="mt-2 text-muted-foreground">
                  Nada foi apagado nem escondido — tudo continua no relatório técnico.
                </p>

                {/* Caminho para resolver, no lugar onde o problema aparece. */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.sem_fechamento > 0 && (
                    <Button
                      size="sm"
                      variant={p.elegiveis === 0 ? "default" : "outline"}
                      onClick={() => navigate("/relatorios/pendencias")}
                    >
                      Registrar fechamentos
                    </Button>
                  )}
                  {p.sem_classificacao > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/relatorios/classificacao")}
                    >
                      Classificar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ============================================================
          QUEM CONTRIBUIU
          ============================================================ */}
      <Section
        title="Contribuição por pessoa"
        description={
          vejoTodos
            ? "Pontos por pessoa. A meta é da equipe — a soma é que conta."
            : "Você vê a sua linha. Ver a de outras pessoas exige permissão específica."
        }
      >
        {porPessoa.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : pessoas.length === 0 ? (
          <EmptyPanel
            icon={Coins}
            title="Nenhuma entrega apurada"
            description="Ainda não há entrega com fechamento e classificação neste ciclo."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead className="w-[90px] text-right">Entregas</TableHead>
                  <TableHead className="w-[70px] text-right">Fácil</TableHead>
                  <TableHead className="w-[70px] text-right">Médio</TableHead>
                  <TableHead className="w-[70px] text-right">Difícil</TableHead>
                  <TableHead className="w-[80px] text-right">Pontos</TableHead>
                  <TableHead className="w-[130px]">Pendente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pessoas.map((x) => (
                  <TableRow key={x.pessoa_id}>
                    <TableCell title={x.pessoa_nome ?? undefined}>
                      {nomeCurto(x.pessoa_nome ?? x.pessoa_email)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{x.entregas}</TableCell>
                    <TableCell className="text-right tabular-nums">{x.facil}</TableCell>
                    <TableCell className="text-right tabular-nums">{x.media}</TableCell>
                    <TableCell className="text-right tabular-nums">{x.dificil}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {x.pontos}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {x.sem_fechamento > 0 && `${x.sem_fechamento} s/ fechamento`}
                      {x.sem_fechamento > 0 && x.sem_classificacao > 0 && " · "}
                      {x.sem_classificacao > 0 && `${x.sem_classificacao} s/ classe`}
                      {x.sem_fechamento === 0 && x.sem_classificacao === 0 && "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {pessoas.length > 1 && (
                  <TableRow className="bg-muted/40 font-medium">
                    <TableCell>Total da equipe</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pessoas.reduce((s, x) => s + x.entregas, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pessoas.reduce((s, x) => s + x.facil, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pessoas.reduce((s, x) => s + x.media, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pessoas.reduce((s, x) => s + x.dificil, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pessoas.reduce((s, x) => s + x.pontos, 0)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/* ============================================================
          QUAIS DEMANDAS FORMARAM ESSES PONTOS
          ============================================================ */}
      <Section title="Entregas do ciclo">
        <div className="mb-3 flex flex-wrap gap-2">
          <Select value={sistema ?? TODOS} onValueChange={(v) => setSistema(v === TODOS ? null : v)}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sistema" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os sistemas</SelectItem>
              {sistemasDoCiclo.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={pessoa ?? TODOS} onValueChange={(v) => setPessoa(v === TODOS ? null : v)}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Pessoa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as pessoas</SelectItem>
              {pessoas.map((x) => (
                <SelectItem key={x.pessoa_id} value={x.pessoa_id}>
                  {x.pessoa_nome ?? x.pessoa_email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={classificacao ?? TODOS}
            onValueChange={(v) => setClassificacao(v === TODOS ? null : v)}
          >
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Classificação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              <SelectItem value="facil">Fácil</SelectItem>
              <SelectItem value="media">Médio</SelectItem>
              <SelectItem value="dificil">Difícil</SelectItem>
              <SelectItem value="sem_classificacao">Sem classificação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {detalhe.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : linhas.length === 0 ? (
          <EmptyPanel
            icon={Coins}
            title="Nenhuma entrega com esses filtros"
            description="Ajuste os filtros acima, ou veja o relatório técnico para o período inteiro."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Demanda</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-[120px]">Sistema</TableHead>
                  <TableHead className="w-[140px]">Responsável</TableHead>
                  <TableHead className="w-[100px]">Conclusão</TableHead>
                  <TableHead className="w-[110px]">Classificação</TableHead>
                  <TableHead className="w-[70px] text-right">Pontos</TableHead>
                  <TableHead className="w-[80px] text-right">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.demanda_id}>
                    <TableCell className="font-mono text-[12px]">
                      {(() => {
                        const est = obterEstiloDoSistema(l.sistema_slug, l.ticket_code || l.titulo);
                        return (
                          <span className={cn("inline-block font-mono font-bold border px-2 py-0.5 rounded-md tracking-tight", est.badgeClass)}>
                            {formatarReferenciaComSigla(l.ticket_code, l.sistema_slug, l.demanda_id, l.titulo)}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">{l.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {l.sistema_slug ?? "não identificado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px]" title={l.responsavel_nome ?? undefined}>
                      {nomeCurto(l.responsavel_nome)}
                    </TableCell>
                    <TableCell className="tabular-nums text-[13px]">
                      {formatarData(l.concluida_em)}
                    </TableCell>
                    <TableCell>
                      {l.classificacao_rotulo ? (
                        <Badge variant="secondary" className="font-normal">
                          {l.classificacao_rotulo}
                        </Badge>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">
                          {l.fechamento === "concluido" ? "aguardando" : "s/ fechamento"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-[13px]">
                      {l.pontos ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-[13px]">
                      {l.minutos_lancados > 0
                        ? formatarDuracao(l.minutos_lancados)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/* ============================================================
          FECHAR E REABRIR
          ============================================================ */}
      {podeAdministrar && r && (
        <Section title="Fechamento do ciclo">
          {!r.congelado ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted-foreground">
                Fechar congela o resultado deste ciclo. Depois disso, reclassificar uma demanda
                não altera mais o que já foi apurado — cada entrega fica gravada com o título, o
                responsável e os pontos que tinha no momento do fechamento.
              </p>
              {p && p.sem_classificacao > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[13px]">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <p>
                    Ainda há <strong>{p.sem_classificacao}</strong> entrega
                    {p.sem_classificacao === 1 ? "" : "s"} aguardando classificação. Fechando
                    agora, ela{p.sem_classificacao === 1 ? "" : "s"} não entra
                    {p.sem_classificacao === 1 ? "" : "m"} neste ciclo.
                  </p>
                </div>
              )}
              <Button
                className="self-start"
                onClick={() => fechar.mutate()}
                disabled={fechar.isPending || r.entregas === 0}
              >
                <Lock className="size-4" aria-hidden />
                Fechar ciclo
              </Button>
            </div>
          ) : r.situacao === "aprovado" ? (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-[13px]">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <p className="text-muted-foreground">
                Ciclo aprovado. O resultado é definitivo e não pode ser reaberto — uma correção
                depois disso é ajuste registrado, não reescrita.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted-foreground">
                Ciclo fechado. Reabrir apaga o congelamento e volta a calcular ao vivo — o motivo
                fica registrado no ciclo.
              </p>
              {!reabrindo ? (
                <Button variant="outline" className="self-start" onClick={() => setReabrindo(true)}>
                  <LockOpen className="size-4" aria-hidden />
                  Reabrir
                </Button>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[280px] flex-1">
                    <Input
                      placeholder="Por que está reabrindo (mínimo 10 caracteres)"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => reabrir.mutate()}
                    disabled={motivo.trim().length < 10 || reabrir.isPending}
                  >
                    Confirmar
                  </Button>
                  <Button variant="ghost" onClick={() => { setReabrindo(false); setMotivo(""); }}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </PageShell>
  );
}

export default memo(Apurar);
export { Apurar as Apuracao };
