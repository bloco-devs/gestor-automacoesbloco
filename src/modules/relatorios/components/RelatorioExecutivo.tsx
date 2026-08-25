import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  UserCheck,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import { EmptyPanel, PageHeader, PageShell, Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { downloadCsv, toCsv } from "@/modules/analytics/utils/csv";
import { useAuth } from "@/hooks/useAuth";
import {
  buscarCiclosAdministraveis,
  buscarResultadoDoCiclo,
  buscarPendenciasDoCiclo,
  formatarPercentual,
  formatarReais,
} from "../services/apuracao-data";
import {
  buscarApuracao,
  buscarCiclos,
  buscarImplementacoes,
  buscarMinhasCapacidades,
} from "../services/relatorios-data";
import { formatarData, percentualDeAlcance } from "../services/relatorios-service";
import { exportarPdfExecutivo } from "../services/pdf-exporter";
import { formatarReferenciaComSigla, nomeDoSistemaPeloSlug } from "@/domain/demand";
import { VoltarParaRelatorios } from "./VoltarParaRelatorios";

export function RelatorioExecutivo() {
  const { user } = useAuth();
  const [cicloId, setCicloId] = useState<string | null>(null);

  const capacidades = useQuery({
    queryKey: ["relatorio", "minhas-capacidades"],
    queryFn: buscarMinhasCapacidades,
    staleTime: 60_000,
  });

  const temPermissao =
    (capacidades.data ?? []).includes("remuneracao.ver_todas") ||
    (capacidades.data ?? []).includes("relatorios.gerar");

  const ciclos = useQuery({
    queryKey: ["relatorio", "ciclos"],
    queryFn: buscarCiclos,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!cicloId && ciclos.data?.length) {
      setCicloId(ciclos.data[0].id);
    }
  }, [ciclos.data, cicloId]);

  const ciclo = ciclos.data?.find((c) => c.id === cicloId) ?? null;

  const resultado = useQuery({
    queryKey: ["relatorio", "resultado-ciclo", cicloId],
    queryFn: () => buscarResultadoDoCiclo(cicloId!),
    enabled: !!cicloId && temPermissao,
  });

  const pendencias = useQuery({
    queryKey: ["relatorio", "pendencias-ciclo", cicloId],
    queryFn: () => buscarPendenciasDoCiclo(cicloId!),
    enabled: !!cicloId && temPermissao,
  });

  const porPessoa = useQuery({
    queryKey: ["relatorio", "apuracao-pessoas", cicloId],
    queryFn: () => buscarApuracao(cicloId!),
    enabled: !!cicloId && temPermissao,
  });

  const atividades = useQuery({
    queryKey: ["relatorio", "atividades-executivo", cicloId],
    queryFn: () =>
      buscarImplementacoes({
        inicio: new Date(ciclo!.inicio),
        fim: new Date(ciclo!.fim),
      }),
    enabled: !!ciclo && temPermissao,
  });

  /**
   * Dados de auditoria do ciclo — quem fechou, quando, e o histórico de
   * reaberturas. Ficam numa consulta separada porque exigem capacidade de
   * remuneração, e esta tela também é acessível por `relatorios.gerar`.
   *
   * `retry: false` e falha silenciosa de propósito: quem não tiver a
   * capacidade continua gerando o PDF, que então declara não ter obtido esses
   * dados. Melhor um relatório que admite o que não sabe do que um erro que
   * impede de gerar qualquer coisa.
   */
  const auditoria = useQuery({
    queryKey: ["relatorio", "ciclos-administraveis"],
    queryFn: buscarCiclosAdministraveis,
    enabled: !!cicloId,
    retry: false,
  });

  const r = resultado.data;
  const p = pendencias.data;
  const cicloAuditado = auditoria.data?.find((c) => c.id === cicloId) ?? null;
  const pessoas = useMemo(() => porPessoa.data ?? [], [porPessoa.data]);
  const linhas = useMemo(() => atividades.data ?? [], [atividades.data]);

  function exportarPdf() {
    if (!r) return;
    exportarPdfExecutivo({
      resultado: r,
      pessoas,
      atividades: linhas,
      pendencias: p,
      geradoPorEmail: user?.email ?? "Usuário Autenticado",
      // O histórico de reaberturas mora aqui: `relatorio_reabrir_ciclo` grava
      // motivo, autor e data acumulados em `observacoes`.
      observacoes: cicloAuditado?.observacoes ?? null,
      ciclo: cicloAuditado
        ? {
            referencia: cicloAuditado.referencia,
            fechado_em: cicloAuditado.fechado_em,
            fechado_por_email: cicloAuditado.fechado_por_email,
          }
        : null,
    });
  }

  function exportarCsvExecutivo() {
    if (!r) return;
    downloadCsv(
      `relatorio-executivo-${r.ciclo_rotulo.replace("/", "-")}.csv`,
      toCsv(
        linhas.map((l) => ({
          // A sigla real, não o REC-/REQ- genérico. A tabela da tela já
          // fazia isso; o CSV saía com o código cru, então o mesmo item
          // aparecia com dois nomes dependendo de onde se olhava.
          Demanda: formatarReferenciaComSigla(l.ticket_code, l.sistema_slug, l.demanda_id, l.titulo),
          Título: l.titulo,
          Sistema: nomeDoSistemaPeloSlug(l.sistema_slug) ?? l.sistema_slug ?? "Não informado",
          Responsável: l.responsavel_nome ?? "—",
          "Concluído em": formatarData(l.concluida_em),
          Classificação: l.classificacao_rotulo ?? "Não classificada",
          Pontos: l.pontos ?? 0,
          // "Autoclassificada: Sim" fazia parecer que o sistema classificou
          // sozinho — e nada aqui classifica sozinho. A marca diz que quem
          // classificou foi a pessoa responsável pela entrega, o que existe
          // para o RH revisar por amostragem. A coluna passa a dizer isso.
          "Classificada por": l.autoclassificada ? "Próprio autor" : "Outra pessoa",
          Fechamento: l.fechamento === "concluido" ? "Registrado" : "Pendente",
        }))
      )
    );
  }

  if (ciclos.isLoading) {
    return (
      <PageShell>
        <PageHeader title="Relatório Executivo" icon={<FileText className="size-6" aria-hidden />} />
        <Skeleton className="h-32 w-full" />
      </PageShell>
    );
  }

  if (!temPermissao) {
    return (
      <PageShell>
        <VoltarParaRelatorios />
        <PageHeader title="Relatório Executivo" icon={<FileText className="size-6" aria-hidden />} />
        <EmptyPanel
          icon={Lock}
          title="Acesso Restrito ao RH e Gestão"
          description="Você precisa da capacidade de relatórios ou de remuneração total para visualizar o relatório executivo oficial."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <VoltarParaRelatorios />
        <div className="flex flex-wrap items-center gap-2">
          {ciclos.data && ciclos.data.length > 0 && (
            <Select value={cicloId ?? undefined} onValueChange={setCicloId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione o ciclo" />
              </SelectTrigger>
              <SelectContent>
                {ciclos.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.rotulo} ({formatarData(c.inicio)} a {formatarData(c.fim)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" onClick={exportarCsvExecutivo} disabled={!r}>
            <FileSpreadsheet className="mr-2 size-4" /> CSV
          </Button>

          <Button onClick={exportarPdf} disabled={!r}>
            <Download className="mr-2 size-4" /> Gerar PDF Oficial
          </Button>
        </div>
      </div>

      {/* DOCUMENTO FORMAL IMPRESSÃO / TELA */}
      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        {/* Cabeçalho do Relatório */}
        <div className="flex flex-wrap items-start justify-between border-b pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-lg">
              <Building2 className="size-5" /> GRUPO BLOCO
            </div>
            <h1 className="text-xl font-bold tracking-tight mt-1">
              RELATÓRIO DE APURAÇÃO DE REMUNERAÇÃO VARIÁVEL
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ciclo: <span className="font-medium text-foreground">{r?.ciclo_rotulo ?? "—"}</span> (
              {r?.inicio ? formatarData(r.inicio) : "—"} a {r?.fim ? formatarData(r.fim) : "—"})
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            <Badge variant={r?.congelado ? "default" : "outline"} className="text-xs">
              Status: {r?.situacao?.toUpperCase() ?? "EM_APURACAO"}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="size-3.5" /> Data de geração:{" "}
              {new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </span>
          </div>
        </div>

        {/* 1. Resumo Executivo */}
        <Section
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> 1. Resumo Executivo do Ciclo
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <span className="ds-caption text-muted-foreground">Meta da Equipe</span>
              {/* A meta é configuração do ciclo, não constante do sistema. */}
              <p className="text-xl font-bold mt-1">
                {r?.meta_pontos ? `${r.meta_pontos} pts` : "—"}
              </p>
              <span className="text-xs text-muted-foreground">800 pts = 100%</span>
            </div>

            <div className="rounded-xl border bg-muted/40 p-4">
              <span className="ds-caption text-muted-foreground">Pontos Realizados</span>
              <p className="text-xl font-bold mt-1 text-primary">{r?.pontos ?? 0} pts</p>
              <span className="text-xs text-muted-foreground">{r?.entregas ?? 0} entregas elegíveis</span>
            </div>

            <div className="rounded-xl border bg-muted/40 p-4">
              <span className="ds-caption text-muted-foreground">% Atingimento</span>
              <p className="text-xl font-bold mt-1">{formatarPercentual(r?.percentual)}</p>
              <span className="text-xs text-muted-foreground">Meta atingida</span>
            </div>

            <div className="rounded-xl border bg-muted/40 p-4">
              <span className="ds-caption text-muted-foreground">Valor Total (R$)</span>
              <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {r?.faixa_indefinida
                  ? "Indefinida"
                  : r?.valor_reais !== null && r?.valor_reais !== undefined
                  ? formatarReais(r.valor_reais)
                  : "—"}
              </p>
              <span className="text-xs text-muted-foreground">{r?.faixa_rotulo || "Faixa atual"}</span>
            </div>
          </div>

          {r?.faixa_indefinida && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <h4 className="font-semibold text-sm">Faixa de remuneração não definida</h4>
                <p className="text-xs mt-0.5">
                  O percentual atingido ({formatarPercentual(r.percentual)}) não corresponde atualmente a uma faixa financeira configurada para o ciclo. O valor não foi calculado automaticamente para evitar estimativas incorretas.
                </p>
              </div>
            </div>
          )}
        </Section>

        {/* 2. Tabela da Equipe */}
        <Section
          title={
            <div className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" /> 2. Desempenho da Equipe
            </div>
          }
        >
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Desenvolvedor</TableHead>
                  <TableHead className="text-center">Demandas</TableHead>
                  <TableHead className="text-center">Fácil / Médio / Difícil</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">% Meta Equipe</TableHead>
                  {/* Era "Valor Financeiro", com o dinheiro da equipe rateado
                      por pontos. A regra de distribuição individual não existe
                      — as faixas são o resultado do conjunto. Ver o comentário
                      em pdf-exporter.ts, na montagem desta mesma tabela. */}
                  <TableHead className="text-right">% da produção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pessoas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Nenhum colaborador apurado no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  pessoas.map((p) => {
                    // Sem `?? 800`: a meta é do ciclo e o RH pode mudá-la. Se
                    // ela não vier, mostra "—" em vez de calcular percentual
                    // sobre um número que talvez não seja o daquele ciclo.
                    const pctMeta = r?.meta_pontos
                      ? formatarPercentual(percentualDeAlcance(p.pontos, r.meta_pontos))
                      : "—";
                    const fracaoDaProducao =
                      r && r.pontos > 0 ? `${Math.round((p.pontos / r.pontos) * 100)}%` : "—";

                    return (
                      <TableRow key={p.pessoa_id}>
                        <TableCell className="font-medium">{p.pessoa_nome || p.pessoa_email}</TableCell>
                        <TableCell className="text-center">{p.entregas}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-mono">
                            {p.facil} / {p.media} / {p.dificil}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">{p.pontos} pts</TableCell>
                        <TableCell className="text-right">{pctMeta}</TableCell>
                        <TableCell className="text-right font-medium">
                          {fracaoDaProducao}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {/* Sem esta nota, quem vê "60% da produção" ao lado do valor da
              equipe faz a multiplicação de cabeça — que é justamente a conta
              que o sistema deixou de fazer por não ter regra que a sustente. */}
          <p className="ds-caption mt-2 text-muted-foreground">
            A faixa de remuneração é apurada sobre o resultado da equipe. A regra de distribuição
            individual ainda não foi definida pelo RH, por isso não há valor por pessoa aqui.
          </p>
        </Section>

        {/* 3. Diagnóstico e Pendências */}
        {p && (
          <Section
            title={
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" /> 3. Diagnóstico de Pendências
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border p-3 text-xs bg-muted/20">
                <span className="text-muted-foreground block">Elegíveis / Concluídas</span>
                <span className="font-bold text-base mt-1 block">
                  {p.elegiveis} / {p.concluidas_no_ciclo}
                </span>
              </div>
              <div className="rounded-xl border p-3 text-xs bg-muted/20">
                <span className="text-muted-foreground block">Sem Fechamento Técnico</span>
                <span className={`font-bold text-base mt-1 block ${p.sem_fechamento > 0 ? "text-amber-600" : ""}`}>
                  {p.sem_fechamento}
                </span>
              </div>
              <div className="rounded-xl border p-3 text-xs bg-muted/20">
                <span className="text-muted-foreground block">Sem Classificação</span>
                <span className={`font-bold text-base mt-1 block ${p.sem_classificacao > 0 ? "text-amber-600" : ""}`}>
                  {p.sem_classificacao}
                </span>
              </div>
              <div className="rounded-xl border p-3 text-xs bg-muted/20">
                <span className="text-muted-foreground block">Sem Data Confiável</span>
                <span className="font-bold text-base mt-1 block">{p.sem_data_confiavel}</span>
              </div>
            </div>
          </Section>
        )}

        {/* 4. Tabela Completa de Atividades */}
        <Section
          title={
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-primary" /> 4. Atividades Apuradas no Ciclo
            </div>
          }
        >
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Conclusão</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-center">Classificada por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      Nenhuma atividade registrada neste ciclo.
                    </TableCell>
                  </TableRow>
                ) : (
                  linhas.map((atv) => (
                    <TableRow key={atv.demanda_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatarReferenciaComSigla(atv.ticket_code, atv.sistema_slug, atv.demanda_id, atv.titulo)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{atv.titulo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {nomeDoSistemaPeloSlug(atv.sistema_slug) || atv.sistema_slug || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{atv.responsavel_nome || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatarData(atv.concluida_em)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-normal">
                          {atv.classificacao_rotulo || "Não classificada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">{atv.pontos ?? 0} pts</TableCell>
                      <TableCell className="text-center text-xs">
                        {atv.autoclassificada ? (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            próprio autor
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">outra pessoa</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>

        {/* 5. Trilha de Auditoria */}
        <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Trilha de Auditoria do Relatório</p>
          <p>Relatório gerado por: {user?.email || "Usuário do Sistema"}</p>
          <p>Imutabilidade do Ciclo: {r?.congelado ? "Snapshot Ativo (Congelado)" : "Apuração Dinâmica (Em Aberto)"}</p>
        </div>
      </div>
    </PageShell>
  );
}
