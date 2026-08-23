import { memo, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Info,
  Lock,
  LockOpen,
  Target,
  TriangleAlert,
} from "lucide-react";
import { EmptyPanel, KpiRow, PageHeader, PageShell, Section, StatCard } from "@/design-system";
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
  buscarImplementacoes,
  buscarMinhasCapacidades,
} from "../services/relatorios-data";
import { formatarData } from "../services/relatorios-service";
import { formatarDuracao } from "../services/fechamento-data";

const TODOS = "__todos__";

function Apurar() {
  const qc = useQueryClient();
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
  const pessoas = porPessoa.data ?? [];
  const linhas = detalhe.data ?? [];

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
        title="Apuração da remuneração variável"
        subtitle="Ciclo do dia 20 ao dia 19. Só entram entregas com data confirmada, fechamento registrado e classificação definida."
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
            <Button variant="outline" size="sm" onClick={exportar} disabled={linhas.length === 0}>
              CSV
            </Button>
          </div>
        }
      />

      {/* ============================================================
          A PERGUNTA 1: QUANTOS PONTOS A EQUIPE FEZ?
          Fica no topo, em número grande, antes de qualquer detalhe.
          ============================================================ */}
      {resultado.isLoading || !r ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Section
          title={r.ciclo_rotulo}
          description={`${formatarData(r.inicio)} a ${formatarData(
            new Date(new Date(r.fim).getTime() - 1).toISOString(),
          )}`}
          actions={
            <div className="flex items-center gap-2">
              <Badge variant={r.congelado ? "default" : "outline"} className="font-normal">
                {r.situacao === "aberto" ? "aberto" :
                 r.situacao === "em_analise" ? "em apuração" :
                 r.situacao === "fechado" ? "fechado" : "aprovado"}
              </Badge>
              {r.congelado && (
                <span className="ds-caption inline-flex items-center gap-1 text-muted-foreground">
                  <Lock className="size-3" aria-hidden />
                  resultado congelado
                </span>
              )}
            </div>
          }
        >
          <KpiRow>
            <StatCard label="Pontos realizados" value={r.pontos} icon={Coins} />
            <StatCard label="Meta da equipe" value={r.meta_pontos} icon={Target} />
            <StatCard
              label="Alcance"
              value={formatarPercentual(r.percentual)}
              tone={
                (r.percentual ?? 0) >= 100 ? "success"
                : (r.percentual ?? 0) >= 80 ? "neutral"
                : "warning"
              }
              hint={`${r.entregas} entrega${r.entregas === 1 ? "" : "s"} elegível${r.entregas === 1 ? "" : "eis"}`}
            />
            <StatCard
              label="Remuneração"
              value={r.faixa_indefinida ? "a definir" : formatarReais(r.valor_reais)}
              tone={r.faixa_indefinida ? "warning" : "neutral"}
              hint={r.faixa_indefinida ? undefined : (r.faixa_rotulo ?? undefined)}
            />
          </KpiRow>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            <span>
              <span className="text-muted-foreground">Fácil:</span> {r.facil} × 50 ={" "}
              <span className="tabular-nums">{r.facil * 50}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Médio:</span> {r.media} × 100 ={" "}
              <span className="tabular-nums">{r.media * 100}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Difícil:</span> {r.dificil} × 200 ={" "}
              <span className="tabular-nums">{r.dificil * 200}</span>
            </span>
          </div>

          {/* A LACUNA, quando acontece. É o único lugar da tela onde um valor
              deveria estar e não está — então precisa explicar por quê, e de
              quem depende a decisão. */}
          {r.faixa_indefinida && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[13px]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <div>
                <p className="font-medium">Faixa de remuneração não definida</p>
                <p className="text-muted-foreground">
                  O alcance de {formatarPercentual(r.percentual)} cai num intervalo sem regra
                  cadastrada — as faixas conhecidas vão até 100% e retomam em 120%.{" "}
                  <strong>Necessária definição do RH.</strong>
                </p>
                <p className="mt-1 text-muted-foreground">
                  Os pontos estão apurados e corretos. O que falta é quanto esse alcance vale em
                  reais — o sistema não preenche isso por conta própria.
                </p>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ============================================================
          POR QUE O NÚMERO NÃO FECHA COM O TOTAL DE CONCLUÍDAS
          ============================================================ */}
      {p && p.concluidas_no_ciclo > p.elegiveis && (
        <Section title="Pendências do ciclo">
          <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-[13px]">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex-1">
              <p>
                <strong>{p.concluidas_no_ciclo}</strong> demandas foram concluídas neste ciclo, mas
                só <strong>{p.elegiveis}</strong> entraram na apuração. A diferença:
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
                {p.sem_fechamento > 0 && (
                  <li>
                    <strong className="text-foreground">{p.sem_fechamento}</strong> sem fechamento
                    técnico registrado
                  </li>
                )}
                {p.sem_classificacao > 0 && (
                  <li>
                    <strong className="text-foreground">{p.sem_classificacao}</strong> com
                    fechamento, aguardando classificação
                  </li>
                )}
                {p.sem_data_confiavel > 0 && (
                  <li>
                    <strong className="text-foreground">{p.sem_data_confiavel}</strong> sem data de
                    conclusão confirmável
                  </li>
                )}
              </ul>
              <p className="mt-2 text-muted-foreground">
                Nenhuma foi apagada nem escondida — todas continuam no relatório técnico.
              </p>
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
                    <TableCell>{x.pessoa_nome ?? x.pessoa_email ?? "—"}</TableCell>
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
          <EmptyPanel icon={AlertTriangle} title="Nenhuma entrega com esses filtros" />
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
                    <TableCell className="font-mono text-[12px]">{l.ticket_code}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{l.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {l.sistema_slug ?? "não identificado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-[13px]">
                      {l.responsavel_nome ?? "—"}
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
