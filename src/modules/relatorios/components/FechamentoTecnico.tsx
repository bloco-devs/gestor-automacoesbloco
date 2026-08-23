import { memo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Info,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { PageHeader, PageShell, Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adicionarIntervalo,
  buscarFechamento,
  buscarIntervalos,
  formatarDuracao,
  removerIntervalo,
  salvarFechamento,
  somarMinutos,
  type RascunhoDeFechamento,
} from "../services/fechamento-data";
import { formatarData } from "../services/relatorios-service";
import { VoltarParaRelatorios } from "./VoltarParaRelatorios";

/** Os quatro que o banco exige para marcar como concluído. */
const OBRIGATORIOS = [
  {
    campo: "problema_identificado" as const,
    rotulo: "Problema identificado",
    dica: "O que estava errado, ou o que faltava. Do ponto de vista de quem sofria com isso.",
  },
  {
    campo: "solucao_implementada" as const,
    rotulo: "Solução implementada",
    dica: "O que foi feito para resolver.",
  },
  {
    campo: "o_que_foi_alterado" as const,
    rotulo: "O que foi alterado",
    dica: "Telas, fluxos, regras, tabelas — o que mudou de fato.",
  },
  {
    campo: "resultado_obtido" as const,
    rotulo: "Resultado obtido",
    dica: "No que deu. O que a pessoa consegue fazer agora que não conseguia antes.",
  },
];

/** Aplicáveis só quando houve. Vazio aqui não é lacuna, é "não teve". */
const OPCIONAIS = [
  {
    campo: "funcionalidades_implementadas" as const,
    rotulo: "Funcionalidades implementadas",
    dica: "",
  },
  { campo: "integracoes_realizadas" as const, rotulo: "Integrações realizadas", dica: "" },
  { campo: "banco_alterado" as const, rotulo: "Alterações de banco de dados", dica: "" },
  { campo: "seguranca_rls" as const, rotulo: "Segurança e permissões (RLS)", dica: "" },
  { campo: "testes_realizados" as const, rotulo: "Testes realizados", dica: "" },
  { campo: "observacoes" as const, rotulo: "Observações", dica: "" },
];

type Campos = RascunhoDeFechamento;

function FechamentoTecnicoImpl() {
  const { demandaId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [campos, setCampos] = useState<Campos>({});
  const [sistemas, setSistemas] = useState("");
  const [links, setLinks] = useState("");
  const [novoInicio, setNovoInicio] = useState("");
  const [novoFim, setNovoFim] = useState("");
  const [novaObs, setNovaObs] = useState("");
  const [opcionaisAbertos, setOpcionaisAbertos] = useState(false);
  const [tempoAberto, setTempoAberto] = useState(false);
  const [acabouDeRegistrar, setAcabouDeRegistrar] = useState(false);

  // A demanda vem por consulta comum. Quem preenche o fechamento é o
  // responsável, então a política por dono já o autoriza. Se por algum motivo
  // não vier, os campos começam vazios em vez de a tela quebrar.
  const demanda = useQuery({
    queryKey: ["relatorio", "demanda-cabecalho", demandaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("demands" as never)
        .select("id, ticket_code, title, description, sistema_slug, created_at")
        .eq("id", demandaId)
        .maybeSingle();
      return (data as unknown as {
        ticket_code: string;
        title: string;
        description: string | null;
        sistema_slug: string | null;
        created_at: string;
      } | null) ?? null;
    },
    enabled: !!demandaId,
  });

  const fechamento = useQuery({
    queryKey: ["relatorio", "fechamento", demandaId],
    queryFn: () => buscarFechamento(demandaId),
    enabled: !!demandaId,
  });

  const intervalos = useQuery({
    queryKey: ["relatorio", "intervalos", demandaId],
    queryFn: () => buscarIntervalos(demandaId),
    enabled: !!demandaId,
  });

  // Carrega o que já existe; se não existe, semeia "o que foi solicitado" com
  // a descrição original da demanda. Semear é cópia de texto que alguém já
  // escreveu — não é geração.
  useEffect(() => {
    if (fechamento.isLoading || demanda.isLoading) return;
    if (fechamento.data) {
      const f = fechamento.data;
      setCampos({
        o_que_foi_solicitado: f.o_que_foi_solicitado,
        problema_identificado: f.problema_identificado,
        solucao_implementada: f.solucao_implementada,
        o_que_foi_alterado: f.o_que_foi_alterado,
        funcionalidades_implementadas: f.funcionalidades_implementadas,
        integracoes_realizadas: f.integracoes_realizadas,
        banco_alterado: f.banco_alterado,
        seguranca_rls: f.seguranca_rls,
        testes_realizados: f.testes_realizados,
        resultado_obtido: f.resultado_obtido,
        observacoes: f.observacoes,
        data_inicio: f.data_inicio,
        data_conclusao_declarada: f.data_conclusao_declarada,
      });
      setSistemas((f.sistemas_afetados ?? []).join(", "));
      setLinks((f.evidencias_links ?? []).join("\n"));
    } else {
      setCampos({
        o_que_foi_solicitado: demanda.data?.description ?? null,
      });
      setSistemas(demanda.data?.sistema_slug ?? "");
    }
  }, [fechamento.data, fechamento.isLoading, demanda.data, demanda.isLoading]);

  const salvar = useMutation({
    mutationFn: (situacao: "rascunho" | "concluido") =>
      salvarFechamento(demandaId, {
        ...campos,
        sistemas_afetados: sistemas.split(",").map((s) => s.trim()).filter(Boolean),
        evidencias_links: links.split("\n").map((s) => s.trim()).filter(Boolean),
        situacao,
      }),
    onSuccess: (_d, situacao) => {
      void qc.invalidateQueries({ queryKey: ["relatorio"] });
      if (situacao === "concluido") {
        // NÃO navega para longe.
        //
        // A primeira versão jogava de volta na fila de pendências — onde a
        // demanda acabava de sair da lista. O efeito era a entrega
        // desaparecer da tela sem dizer para onde foi, e parecer perdida.
        // Agora a confirmação acontece aqui, onde a pessoa estava.
        setAcabouDeRegistrar(true);
        toast.success("Fechamento registrado");
      } else {
        toast.success("Rascunho salvo");
      }
    },
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  const lancarTempo = useMutation({
    mutationFn: () => {
      if (!novoInicio || !novoFim) throw new Error("Informe início e fim.");
      return adicionarIntervalo(demandaId, new Date(novoInicio), new Date(novoFim), novaObs);
    },
    onSuccess: () => {
      setNovoInicio("");
      setNovoFim("");
      setNovaObs("");
      void qc.invalidateQueries({ queryKey: ["relatorio", "intervalos", demandaId] });
      toast.success("Tempo lançado");
    },
    onError: (e: Error) => toast.error("Não foi possível lançar", { description: e.message }),
  });

  const apagarTempo = useMutation({
    mutationFn: removerIntervalo,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["relatorio", "intervalos", demandaId] });
    },
  });

  const faltando = OBRIGATORIOS.filter(
    (o) => !(campos[o.campo] ?? "").toString().trim(),
  ).map((o) => o.rotulo);

  const opcionaisPreenchidos = OPCIONAIS.filter(
    (o) => (campos[o.campo] ?? "").toString().trim(),
  ).length;

  const carregando = fechamento.isLoading || demanda.isLoading;
  const jaConcluido = fechamento.data?.situacao === "concluido";
  const minutos = somarMinutos(intervalos.data ?? []);

  const set = (campo: keyof Campos) => (v: string) =>
    setCampos((c) => ({ ...c, [campo]: v }));

  return (
    <PageShell maxWidth="xl">
      <PageHeader
        breadcrumb={
          <VoltarParaRelatorios para="/relatorios/pendencias" rotulo="Pendências" />
        }
        title="Fechamento técnico"
        subtitle={
          demanda.data
            ? `${demanda.data.ticket_code} · ${demanda.data.title}`
            : "Carregando a demanda…"
        }
        icon={<ClipboardList className="size-6" aria-hidden />}
        actions={
          jaConcluido ? (
            <Badge className="gap-1">
              <CheckCircle2 className="size-3.5" aria-hidden />
              registrado
            </Badge>
          ) : null
        }
      />

      {carregando ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Section
            title="O que foi solicitado"
            description="Vem da descrição original da demanda. Pode ajustar — o texto fica gravado aqui, e continua igual mesmo que alguém edite a demanda depois."
          >
            <Textarea
              rows={3}
              value={campos.o_que_foi_solicitado ?? ""}
              onChange={(e) => set("o_que_foi_solicitado")(e.target.value)}
              placeholder="Não informado."
            />
          </Section>

          <Section
            title="O relato técnico"
            description="Estes quatro campos são necessários para marcar como registrado — sem eles não há base para classificar a entrega."
          >
            <div className="flex flex-col gap-4">
              {OBRIGATORIOS.map((o) => (
                <div key={o.campo}>
                  <Label className="flex items-baseline gap-2">
                    {o.rotulo}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      necessário
                    </span>
                  </Label>
                  {o.dica && (
                    <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">{o.dica}</p>
                  )}
                  <Textarea
                    rows={3}
                    className="mt-1.5"
                    value={(campos[o.campo] ?? "") as string}
                    onChange={(e) => set(o.campo)(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Fechados por padrão.
              A primeira versão mostrava os 21 campos abertos de uma vez, e a
              reação foi "muitos campos" — com razão. Nenhum destes é
              necessário, e a maioria não se aplica na maioria das entregas, mas
              todos ocupavam a tela como se fossem trabalho a fazer. */}
          <Section title="Detalhes técnicos">
            {!opcionaisAbertos ? (
              <button
                type="button"
                onClick={() => setOpcionaisAbertos(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronDown className="size-4 shrink-0" aria-hidden />
                <span>
                  Acrescentar detalhes
                  {opcionaisPreenchidos > 0 && (
                    <span className="ml-1 text-foreground">
                      — {opcionaisPreenchidos} preenchido{opcionaisPreenchidos > 1 ? "s" : ""}
                    </span>
                  )}
                </span>
                <span className="ml-auto text-[12px]">opcional</span>
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="ds-caption text-muted-foreground">
                  Deixe em branco o que não houve nesta entrega. Vazio aqui significa "não teve",
                  e o relatório escreve isso — não é lacuna.
                </p>
                {OPCIONAIS.map((o) => (
                  <div key={o.campo}>
                    <Label>{o.rotulo}</Label>
                    <Textarea
                      rows={2}
                      className="mt-1.5"
                      value={(campos[o.campo] ?? "") as string}
                      onChange={(e) => set(o.campo)(e.target.value)}
                      placeholder="Não se aplica"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOpcionaisAbertos(false)}
                  className="self-start text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Recolher
                </button>
              </div>
            )}
          </Section>

          <Section title="Sistemas afetados e evidências">
            <div className="flex flex-col gap-4">
              <div>
                <Label>Sistemas afetados</Label>
                <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">
                  Separados por vírgula.
                </p>
                <Input
                  value={sistemas}
                  onChange={(e) => setSistemas(e.target.value)}
                  placeholder="produtividade, incorporacao"
                />
              </div>
              <div>
                <Label>Links de evidência</Label>
                <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">
                  Um por linha. Só o que existe de verdade — link inventado é pior que nenhum.
                </p>
                <Textarea
                  rows={3}
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section title="Período e tempo">
            {/* As duas datas ficam SEMPRE visíveis. Elas estavam dentro do
                bloco recolhido atrás de "Lançar horas trabalhadas" — rótulo
                que não as descreve, então ninguém iria procurar data ali. São
                dois campos pequenos; esconder custava mais confusão do que
                economizava espaço. */}
            <div className="mb-3 flex flex-wrap gap-4">
              <div>
                <Label className="text-[12px]">Data de início do trabalho</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={campos.data_inicio ?? ""}
                  onChange={(e) => set("data_inicio")(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[12px]">Data de conclusão</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={campos.data_conclusao_declarada ?? ""}
                  onChange={(e) => set("data_conclusao_declarada")(e.target.value)}
                />
                <p className="ds-caption mt-1 text-muted-foreground">
                  Só para o relato. A data que vale na apuração vem do histórico da demanda.
                </p>
              </div>
            </div>

            {!tempoAberto && minutos === 0 ? (
              <button
                type="button"
                onClick={() => setTempoAberto(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronDown className="size-4 shrink-0" aria-hidden />
                <span>Lançar horas trabalhadas</span>
                <span className="ml-auto text-[12px]">opcional</span>
              </button>
            ) : (
            <div className="flex flex-col gap-3">
              <p className="ds-caption text-muted-foreground">
                Informação de apoio para quem vai classificar. Não define Fácil, Médio ou
                Difícil — nenhuma conta do sistema transforma horas em pontos.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label className="text-[12px]">Início</Label>
                  <Input
                    type="datetime-local"
                    className="mt-1"
                    value={novoInicio}
                    onChange={(e) => setNovoInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Fim</Label>
                  <Input
                    type="datetime-local"
                    className="mt-1"
                    value={novoFim}
                    onChange={(e) => setNovoFim(e.target.value)}
                  />
                </div>
                <div className="min-w-[180px] flex-1">
                  <Label className="text-[12px]">O que fez (opcional)</Label>
                  <Input
                    className="mt-1"
                    value={novaObs}
                    onChange={(e) => setNovaObs(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => lancarTempo.mutate()}
                  disabled={lancarTempo.isPending}
                >
                  <Plus className="size-4" aria-hidden />
                  Lançar
                </Button>
              </div>

              {(intervalos.data ?? []).length > 0 && (
                <div className="flex flex-col divide-y rounded-lg border">
                  {(intervalos.data ?? []).map((i) => (
                    <div key={i.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                      <span className="tabular-nums">{formatarData(i.inicio, true)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="tabular-nums">{formatarData(i.fim, true)}</span>
                      <span className="font-medium tabular-nums">
                        {formatarDuracao(
                          (new Date(i.fim).getTime() - new Date(i.inicio).getTime()) / 60000,
                        )}
                      </span>
                      {i.observacao && (
                        <span className="truncate text-muted-foreground">{i.observacao}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => apagarTempo.mutate(i.id)}
                        aria-label="Remover"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 text-[13px] font-medium">
                    <span>Total</span>
                    <span className="tabular-nums">{formatarDuracao(minutos)}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setTempoAberto(false)}
                className="self-start text-[13px] text-muted-foreground hover:text-foreground"
              >
                Recolher
              </button>
            </div>
            )}
          </Section>

          {/* ---------------------------------------------------------- */}
          <Section title="">
            {/* Onde a entrega foi parar. A pessoa fica na tela em que estava,
                vê a confirmação, e escolhe para onde ir — em vez de ser
                despejada numa lista de onde o item acabou de sair. */}
            {acabouDeRegistrar && (
              <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-success/40 bg-success/10 p-3 text-[13px]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <div className="flex-1">
                  <p className="font-medium">Registrado</p>
                  <p className="text-muted-foreground">
                    Esta entrega saiu da fila de pendências e está em{" "}
                    <strong>Registradas</strong>, pronta para ser classificada. O texto continua
                    editável aqui.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/relatorios/pendencias")}
                    >
                      Voltar para a fila
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate("/relatorios/implementacoes")}
                    >
                      Ver no relatório
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {faltando.length > 0 && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-[13px]">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <p className="font-medium">Falta preencher para registrar</p>
                  <p className="text-muted-foreground">{faltando.join(" · ")}</p>
                  <p className="mt-1 text-muted-foreground">
                    Dá para salvar como rascunho e voltar depois.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => salvar.mutate("rascunho")}
                disabled={salvar.isPending}
              >
                <Save className="size-4" aria-hidden />
                Salvar rascunho
              </Button>
              <Button
                onClick={() => salvar.mutate("concluido")}
                disabled={salvar.isPending || faltando.length > 0}
              >
                <CheckCircle2 className="size-4" aria-hidden />
                {jaConcluido ? "Atualizar registro" : "Registrar fechamento"}
              </Button>
            </div>

            {fechamento.data?.updated_at && (
              <p className="ds-caption mt-3 text-muted-foreground">
                Última alteração em {formatarData(fechamento.data.updated_at, true)}
                {fechamento.data.preenchido_por_email
                  ? ` por ${fechamento.data.preenchido_por_email}`
                  : ""}
              </p>
            )}
          </Section>
        </>
      )}
    </PageShell>
  );
}

export default memo(FechamentoTecnicoImpl);
export { FechamentoTecnicoImpl as FechamentoTecnico };
