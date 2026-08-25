import { memo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  Download,
  FileSearch,
  Layers,
  Paperclip,
  RefreshCw,
  Scale,
  Users,
} from "lucide-react";
import {
  EmptyPanel,
  KpiRow,
  PageHeader,
  PageShell,
  Section,
  StatCard,
} from "@/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toCsv, downloadCsv } from "@/modules/analytics/utils/csv";
import { useRelatorioImplementacoes } from "../hooks/useRelatorioImplementacoes";
import { formatarData } from "../services/relatorios-service";
import { nomeCurto } from "../nomes";
import {
  formatarReferenciaComSigla,
  nomeDoSistemaPeloSlug,
  obterEstiloDoSistema,
} from "@/domain/demand";
import { cn } from "@/lib/utils";
import { VoltarParaRelatorios } from "./VoltarParaRelatorios";
import type { LinhaDeImplementacao } from "../services/relatorios-data";
import type { AtalhoDePeriodo } from "../types";

const ATALHOS: Array<{ valor: AtalhoDePeriodo; rotulo: string }> = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "ontem", rotulo: "Ontem" },
  { valor: "ultimos7", rotulo: "Últimos 7 dias" },
  { valor: "esta_semana", rotulo: "Esta semana" },
  { valor: "semana_anterior", rotulo: "Semana anterior" },
  { valor: "este_mes", rotulo: "Este mês" },
  { valor: "mes_anterior", rotulo: "Mês anterior" },
  { valor: "este_ano", rotulo: "Este ano" },
  { valor: "ano_anterior", rotulo: "Ano anterior" },
  { valor: "personalizado", rotulo: "Personalizado" },
];

/**
 * O relato técnico dentro da linha expandida.
 *
 * A ordem é a de quem lê de fora e precisa entender a entrega sem ter
 * participado dela: qual era o problema, o que foi feito, o que mudou, no que
 * deu. Os quatro primeiros são obrigatórios para concluir o fechamento, então
 * numa entrega registrada eles sempre existem — os demais aparecem só quando
 * se aplicam, porque nem toda entrega mexe em banco, integração ou RLS.
 */
const CAMPOS_DO_RELATO: Array<{ chave: keyof LinhaDeImplementacao; rotulo: string }> = [
  { chave: "fechamento_problema", rotulo: "Qual era o problema" },
  { chave: "fechamento_solucao", rotulo: "Como foi resolvido" },
  { chave: "fechamento_alterado", rotulo: "O que foi alterado" },
  { chave: "fechamento_resultado", rotulo: "Resultado obtido" },
  { chave: "fechamento_funcionalidades", rotulo: "Funcionalidades implementadas" },
  { chave: "fechamento_integracoes", rotulo: "Integrações" },
  { chave: "fechamento_banco", rotulo: "Alterações no banco" },
  { chave: "fechamento_seguranca", rotulo: "Segurança e permissões" },
  { chave: "fechamento_testes", rotulo: "Como foi testado" },
  { chave: "fechamento_observacoes", rotulo: "Observações" },
];

function RelatoTecnico({ l }: { l: LinhaDeImplementacao }) {
  const preenchidos = CAMPOS_DO_RELATO.filter((c) => {
    const v = l[c.chave];
    return typeof v === "string" && v.trim().length > 0;
  });

  if (preenchidos.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="ds-label text-foreground">Relato técnico</span>
        {l.fechamento_por && (
          <span className="ds-caption text-muted-foreground">
            registrado por {l.fechamento_por}
            {l.fechamento_em ? ` em ${formatarData(l.fechamento_em)}` : ""}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {preenchidos.map((c) => (
          <div key={String(c.chave)}>
            <span className="ds-label text-muted-foreground">{c.rotulo}</span>
            <p className="mt-0.5 whitespace-pre-wrap">{String(l[c.chave]).trim()}</p>
          </div>
        ))}
        {l.fechamento_evidencias && l.fechamento_evidencias.length > 0 && (
          <div>
            <span className="ds-label text-muted-foreground">Evidências</span>
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {l.fechamento_evidencias.map((link) => (
                <li key={link} className="truncate">
                  {/* Link externo colado por pessoa: sem confiança implícita. */}
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-primary underline underline-offset-2"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const TIPO_ROTULO: Record<string, string> = {
  bug: "Correção",
  melhoria: "Melhoria",
  nova_funcionalidade: "Nova funcionalidade",
  refatoracao: "Refatoração",
  infraestrutura: "Infraestrutura",
  automacao: "Automação",
};

const TODOS = "__todos__";

function RelatorioImplementacoesImpl() {
  const r = useRelatorioImplementacoes();
  const [expandida, setExpandida] = useState<string | null>(null);

  function exportar() {
    const linhas = r.linhas.map((l) => ({
      Demanda: l.ticket_code,
      Título: l.titulo,
      // O nome, não o slug: "produtividade" é o Gestão de Obra, e ninguém
      // do Grupo Bloco chama assim.
      Sistema: nomeDoSistemaPeloSlug(l.sistema_slug) ?? l.sistema_slug ?? "Não identificado",
      Categoria: TIPO_ROTULO[l.tipo] ?? l.tipo,
      Classificação: l.classificacao_rotulo ?? "Não classificada",
      Pontos: l.pontos ?? "",
      "Justificativa da classificação": l.justificativa ?? "",
      // O relato vai junto: a planilha é o que sai da tela e circula, e sem
      // isto ela dizia quantos pontos a entrega valeu sem dizer o que foi
      // entregue. Os quatro campos obrigatórios do fechamento, nada além —
      // nota interna não passa por aqui.
      "Qual era o problema": l.fechamento_problema ?? "",
      "Como foi resolvido": l.fechamento_solucao ?? "",
      "O que foi alterado": l.fechamento_alterado ?? "",
      "Resultado obtido": l.fechamento_resultado ?? "",
      Ciclo: l.ciclo_rotulo ?? "Fora de ciclo",
      "Fechamento técnico": l.fechamento === "concluido" ? "Registrado" : "Pendente",
      Responsável: l.responsavel_nome ?? "Sem responsável",
      Solicitante: l.solicitante_nome ?? "—",
      Aberta: formatarData(l.criada_em),
      Concluída: formatarData(l.concluida_em),
      "Origem da data": l.procedencia === "confirmada" ? "Registrada" : "Inferida",
      Tarefas: `${l.tarefas_feitas}/${l.tarefas_total}`,
      Comentários: l.comentarios,
      Anexos: l.anexos,
    }));
    downloadCsv(
      `implementacoes-${r.periodo.inicio.toISOString().slice(0, 10)}.csv`,
      toCsv(linhas),
    );
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumb={<VoltarParaRelatorios />}
        title="Relatório de Implementações"
        subtitle="O que foi entregue, por sistema e por pessoa"
        icon={<FileSearch className="size-6" aria-hidden />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={r.recarregar} disabled={r.carregando}>
              <RefreshCw className={r.carregando ? "size-4 animate-spin" : "size-4"} aria-hidden />
              Atualizar
            </Button>
            <Button size="sm" onClick={exportar} disabled={r.linhas.length === 0}>
              <Download className="size-4" aria-hidden />
              CSV
            </Button>
          </div>
        }
      />

      {/* -------------------------------------------------------------- */}
      <Section title="Filtros">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="ds-label mb-1.5 block text-muted-foreground">Período</label>
            <Select
              value={r.filtros.atalho}
              onValueChange={(v) => r.setFiltros((f) => ({ ...f, atalho: v as AtalhoDePeriodo }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATALHOS.map((a) => (
                  <SelectItem key={a.valor} value={a.valor}>{a.rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {r.filtros.atalho === "personalizado" && (
            <>
              <div>
                <label className="ds-label mb-1.5 block text-muted-foreground">De</label>
                <Input
                  type="date"
                  value={r.filtros.de}
                  onChange={(e) => r.setFiltros((f) => ({ ...f, de: e.target.value }))}
                />
              </div>
              <div>
                <label className="ds-label mb-1.5 block text-muted-foreground">Até</label>
                <Input
                  type="date"
                  value={r.filtros.ate}
                  onChange={(e) => r.setFiltros((f) => ({ ...f, ate: e.target.value }))}
                />
              </div>
            </>
          )}

          <div className="min-w-[180px]">
            <label className="ds-label mb-1.5 block text-muted-foreground">Sistema</label>
            <Select
              value={r.filtros.sistema ?? TODOS}
              onValueChange={(v) =>
                r.setFiltros((f) => ({ ...f, sistema: v === TODOS ? null : v }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os sistemas</SelectItem>
                {r.sistemas.map((s) => (
                  <SelectItem key={s.valor} value={s.valor}>
                    {s.rotulo} ({s.quantidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <label className="ds-label mb-1.5 block text-muted-foreground">Responsável</label>
            <Select
              value={r.filtros.responsavel ?? TODOS}
              onValueChange={(v) =>
                r.setFiltros((f) => ({ ...f, responsavel: v === TODOS ? null : v }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {r.responsaveis.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.rotulo} ({p.quantidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px]">
            <label className="ds-label mb-1.5 block text-muted-foreground">Classificação</label>
            <Select
              value={r.filtros.classificacao ?? TODOS}
              onValueChange={(v) =>
                r.setFiltros((f) => ({ ...f, classificacao: v === TODOS ? null : v }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas</SelectItem>
                <SelectItem value="facil">Fácil</SelectItem>
                <SelectItem value="media">Médio</SelectItem>
                <SelectItem value="dificil">Difícil</SelectItem>
                <SelectItem value="sem_classificacao">Sem classificação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px]">
            <label className="ds-label mb-1.5 block text-muted-foreground">Fechamento</label>
            <Select
              value={r.filtros.fechamento ?? TODOS}
              onValueChange={(v) =>
                r.setFiltros((f) => ({ ...f, fechamento: v === TODOS ? null : v }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                <SelectItem value="registrado">Registrado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px] flex-1">
            <label className="ds-label mb-1.5 block text-muted-foreground">Buscar</label>
            <Input
              placeholder="Título, descrição ou código"
              value={r.filtros.busca}
              onChange={(e) => r.setFiltros((f) => ({ ...f, busca: e.target.value }))}
            />
          </div>
        </div>

        <p className="ds-caption mt-3 text-muted-foreground">
          <CalendarRange className="mr-1 inline size-3.5" aria-hidden />
          {formatarData(r.periodo.inicio.toISOString())} a{" "}
          {formatarData(new Date(r.periodo.fim.getTime() - 1).toISOString())}
        </p>
      </Section>

      {/* -------------------------------------------------------------- */}
      <Section title="Resumo">
        <KpiRow>
          <StatCard label="Entregas concluídas" value={r.resumo.total} icon={CheckCircle2} />
          <StatCard label="Sistemas envolvidos" value={r.resumo.sistemas} icon={Layers} />
          <StatCard label="Pessoas" value={r.resumo.responsaveis} icon={Users} />
          <StatCard
            label="Pontos"
            value={r.resumo.pontos}
            icon={Scale}
            hint={
              r.resumo.semClassificacao > 0
                ? `${r.resumo.semClassificacao} sem classificação — não contam`
                : "todas classificadas"
            }
            tone={r.resumo.semClassificacao > 0 ? "warning" : "success"}
          />
        </KpiRow>

        {r.resumo.porClassificacao.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            {r.resumo.porClassificacao.map((c) => (
              <span key={c.codigo}>
                <span className="text-muted-foreground">{c.rotulo}:</span> {c.quantidade} ×{" "}
                {c.quantidade > 0 ? c.pontos / c.quantidade : 0} ={" "}
                <span className="font-medium tabular-nums">{c.pontos}</span>
              </span>
            ))}
          </div>
        )}
      </Section>

      {r.resumo.porSistema.length > 0 && (
        <Section title="Por sistema">
          <div className="flex flex-wrap gap-2">
            {r.resumo.porSistema.map((s) => (
              <button
                key={s.sistema}
                type="button"
                onClick={() =>
                  r.setFiltros((f) => ({
                    ...f,
                    sistema: f.sistema === s.sistema ? null : s.sistema,
                  }))
                }
                className="rounded-full border px-3 py-1 text-[13px] transition-colors hover:bg-accent"
              >
                {s.sistema}{" "}
                <span className="text-muted-foreground">{s.quantidade}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* -------------------------------------------------------------- */}
      <Section
        title="Entregas"
        description={
          r.linhas.length > 0
            ? "Clique numa linha para ver a descrição e a origem da data."
            : undefined
        }
      >
        {r.erro ? (
          <EmptyPanel
            icon={FileSearch}
            title="Não foi possível carregar"
            description={r.erro.message}
          />
        ) : r.carregando ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : r.linhas.length === 0 ? (
          <EmptyPanel
            icon={FileSearch}
            title="Nenhuma entrega no período"
            description="Ajuste o período ou os filtros. Só aparecem demandas concluídas com data de conclusão registrada."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Demanda</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-[130px]">Sistema</TableHead>
                  <TableHead className="w-[150px]">Responsável</TableHead>
                  <TableHead className="w-[110px]">Concluída</TableHead>
                  <TableHead className="w-[120px]">Classificação</TableHead>
                  <TableHead className="w-[70px] text-right">Pontos</TableHead>
                  <TableHead className="w-[90px] text-right">Evidência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.linhas.map((l) => (
                  <>
                    <TableRow
                      key={l.demanda_id}
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandida((atual) => (atual === l.demanda_id ? null : l.demanda_id))
                      }
                    >
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
                      <TableCell className="max-w-[320px] truncate">{l.titulo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {nomeDoSistemaPeloSlug(l.sistema_slug) ?? l.sistema_slug ?? "não identificado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[13px]" title={l.responsavel_nome ?? undefined}>
                        {l.responsavel_nome ? (
                          nomeCurto(l.responsavel_nome)
                        ) : (
                          <span className="text-muted-foreground">sem responsável</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-[13px]">
                        {formatarData(l.concluida_em)}
                        {l.procedencia !== "confirmada" && (
                          <span className="ml-1 text-muted-foreground" title="Data inferida">*</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.classificacao_rotulo ? (
                          <Badge variant="secondary" className="font-normal">
                            {l.classificacao_rotulo}
                          </Badge>
                        ) : l.fechamento !== "concluido" ? (
                          <span className="text-[12px] text-muted-foreground">
                            sem fechamento
                          </span>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">
                            aguardando
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">
                        {/* Sem classificação NÃO vira 0. Zero é um valor; a
                            ausência de decisão é outra coisa. */}
                        {l.pontos ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">
                        {l.anexos + l.comentarios > 0 ? (
                          `${l.anexos + l.comentarios}`
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>

                    {expandida === l.demanda_id && (
                      <TableRow key={`${l.demanda_id}-detalhe`} className="bg-muted/30">
                        <TableCell colSpan={8} className="text-[13px]">
                          <div className="flex flex-col gap-2 py-1">
                            <div>
                              <span className="ds-label text-muted-foreground">
                                O que foi solicitado
                              </span>
                              <p className="mt-0.5 whitespace-pre-wrap">
                                {l.descricao?.trim() || (
                                  <span className="text-muted-foreground">
                                    Não informado na demanda.
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                              <span>Solicitante: {l.solicitante_nome ?? "—"}</span>
                              <span>Aberta em {formatarData(l.criada_em)}</span>
                              <span>Categoria: {TIPO_ROTULO[l.tipo] ?? l.tipo}</span>
                            </div>
                            <div className="text-muted-foreground">
                              <span className="ds-label">Origem da data: </span>
                              {l.evidencia ?? "Não identificada."}
                            </div>
                            <RelatoTecnico l={l} />
                            {l.fechamento !== "concluido" ? (
                              <p className="text-muted-foreground">
                                Fechamento técnico ainda não registrado. Sem ele a entrega não
                                pode ser classificada.
                              </p>
                            ) : l.justificativa ? (
                              <div>
                                <span className="ds-label text-muted-foreground">
                                  Por que {l.classificacao_rotulo} ({l.pontos} pontos)
                                </span>
                                <p className="mt-0.5 whitespace-pre-wrap">{l.justificativa}</p>
                                {l.classificada_por && (
                                  <p className="ds-caption mt-1 text-muted-foreground">
                                    por {l.classificada_por}
                                    {l.classificada_em
                                      ? ` em ${formatarData(l.classificada_em)}`
                                      : ""}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">
                                Fechamento registrado, aguardando classificação.
                              </p>
                            )}
                            {l.ciclo_rotulo && (
                              <p className="text-muted-foreground">
                                <span className="ds-label">Ciclo: </span>
                                {l.ciclo_rotulo}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </PageShell>
  );
}

export default memo(RelatorioImplementacoesImpl);
export { RelatorioImplementacoesImpl as RelatorioImplementacoes };
