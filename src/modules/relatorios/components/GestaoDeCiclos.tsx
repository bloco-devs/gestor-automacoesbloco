/**
 * GESTÃO DE CICLOS
 *
 * A tela que faltava. O motor de apuração sempre leu `inicio` e `fim` da
 * tabela — nunca soube o que é "dia 20". O que não existia era como o RH
 * cadastrar o próximo ciclo, e é essa ausência que fazia 20 → 19 parecer
 * regra do sistema.
 *
 * DUAS DATAS QUE NÃO SÃO A MESMA COISA, e a tela insiste nisso:
 *
 *   Referência da folha    → para qual pagamento o resultado vai (09/2026)
 *   Período de produção    → que trabalho é contado (20/08 a 19/09)
 *
 * A folha de setembro paga trabalho de agosto e setembro. Confundir as duas
 * foi o que gerou a dúvida original sobre "a regra da empresa ser 20 → 19":
 * não é regra de empresa, é a janela deste ciclo, porque a folha de agosto já
 * tinha fechado quando o programa começou.
 *
 * A BORDA DIREITA é traduzida na entrada e na saída. O banco guarda `fim`
 * exclusivo (20/09 00:00); o formulário pergunta pelo último dia que ENTRA
 * (19/09) e mostra a consequência por extenso antes de salvar. Ninguém deveria
 * precisar entender intervalo semiaberto para cadastrar um mês.
 */

import { memo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Lock, Pencil, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { EmptyPanel, PageHeader, PageShell, Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  buscarCiclosAdministraveis,
  criarCiclo,
  editarCiclo,
  fecharCiclo,
  formatarReais,
  reabrirCiclo,
  type CicloAdministravel,
  type DadosDoCiclo,
} from "../services/apuracao-data";
import { buscarMinhasCapacidades } from "../services/relatorios-data";
import {
  diaLocalDe,
  diaParaTexto,
  janelaDoCiclo,
  limiteExclusivo,
  primeiroInstante,
  ultimoDiaIncluido,
} from "../services/relatorios-service";
import { VoltarParaRelatorios } from "./VoltarParaRelatorios";

const SITUACAO_ROTULO: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em conferência",
  fechado: "Fechado",
  aprovado: "Aprovado",
};

interface Formulario {
  rotulo: string;
  referencia: string;
  inicioDia: string;
  fimDia: string;
  meta: string;
}

const VAZIO: Formulario = { rotulo: "", referencia: "", inicioDia: "", fimDia: "", meta: "800" };

function doCiclo(c: CicloAdministravel): Formulario {
  return {
    rotulo: c.rotulo,
    referencia: c.referencia.slice(0, 7),
    // Borda esquerda é inclusiva: o dia do próprio `inicio`. A direita é
    // exclusiva e precisa recuar. As duas não são simétricas.
    inicioDia: diaLocalDe(c.inicio),
    fimDia: ultimoDiaIncluido(c.fim),
    meta: String(c.meta_pontos),
  };
}

/**
 * Preenche as datas com a janela 20 → 19 do mês de referência.
 *
 * É SUGESTÃO, e o botão diz isso. `janelaDoCiclo` não determina o período de
 * ciclo nenhum — quem determina são as datas gravadas. Existe porque, se o
 * próximo ciclo seguir mesmo o padrão do atual, digitar as duas datas à mão
 * é onde alguém erra por um dia.
 */
function sugerir20a19(referencia: string): Pick<Formulario, "inicioDia" | "fimDia"> | null {
  if (!referencia) return null;
  const [ano, mes] = referencia.split("-").map(Number);
  const j = janelaDoCiclo(ano, mes);
  return { inicioDia: diaLocalDe(j.inicio.toISOString()), fimDia: ultimoDiaIncluido(j.fim.toISOString()) };
}

/**
 * A prévia. É o que traduz "fim exclusivo" para linguagem de gente, e o único
 * lugar da tela onde o dia seguinte aparece — dito como o que é: já é do
 * próximo ciclo.
 */
function Previa({ f }: { f: Formulario }) {
  if (!f.inicioDia || !f.fimDia) return null;
  if (f.fimDia < f.inicioDia) {
    return (
      <p className="text-[13px] text-destructive">
        O último dia não pode ser anterior ao primeiro.
      </p>
    );
  }
  const seguinte = new Date(new Date(limiteExclusivo(f.fimDia)).getTime() + 1000);
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-[13px]">
      <p>
        Entram as demandas concluídas de{" "}
        <strong>{diaParaTexto(f.inicioDia)} 00:00</strong> até{" "}
        <strong>{diaParaTexto(f.fimDia)} 23:59:59</strong>.
      </p>
      <p className="mt-1 text-muted-foreground">
        Uma demanda concluída em {diaParaTexto(ultimoDiaIncluido(seguinte.toISOString()))} já
        pertence ao ciclo seguinte.
      </p>
    </div>
  );
}

function Quadro({ c }: { c: CicloAdministravel }) {
  // A partição precisa fechar. Se não fechar, é bug de consulta e a tela tem
  // de denunciar em vez de exibir números que não somam.
  const soma = c.elegiveis + c.sem_fechamento + c.sem_classificacao + c.sem_data_confiavel;
  const linhas: Array<[string, number]> = [
    ["Elegíveis", c.elegiveis],
    ["Sem relato técnico", c.sem_fechamento],
    ["Sem classificação", c.sem_classificacao],
    ["Sem data confiável", c.sem_data_confiavel],
  ];
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="ds-label text-muted-foreground">Elegibilidade</span>
        <span className="text-[13px]">
          <strong>{c.concluidas}</strong> concluídas
        </span>
      </div>
      <div className="flex flex-col gap-1 text-[13px]">
        {linhas.map(([r, n]) => (
          <div key={r} className="flex items-baseline justify-between gap-3">
            <span className={n === 0 ? "text-muted-foreground" : ""}>{r}</span>
            <span className={n === 0 ? "text-muted-foreground" : "font-medium"}>{n}</span>
          </div>
        ))}
      </div>
      {soma !== c.concluidas && (
        <p className="ds-caption mt-2 text-destructive">
          As categorias somam {soma} e as concluídas são {c.concluidas}. Há dupla contagem —
          avise o time técnico.
        </p>
      )}
    </div>
  );
}

function Cartao({
  c,
  podeAdministrar,
  aoEditar,
}: {
  c: CicloAdministravel;
  podeAdministrar: boolean;
  aoEditar: () => void;
}) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [pedindoMotivo, setPedindoMotivo] = useState(false);

  const invalidar = () => void qc.invalidateQueries({ queryKey: ["relatorio"] });

  const fechar = useMutation({
    mutationFn: () => fecharCiclo(c.id),
    onSuccess: (n) => {
      invalidar();
      toast.success(`Ciclo fechado com ${n} ${n === 1 ? "entrega" : "entregas"} congeladas`);
    },
    onError: (e: Error) => toast.error("Não foi possível fechar", { description: e.message }),
  });

  const reabrir = useMutation({
    mutationFn: () => reabrirCiclo(c.id, motivo),
    onSuccess: () => {
      invalidar();
      setPedindoMotivo(false);
      setMotivo("");
      toast.success("Ciclo reaberto. O resultado congelado foi descartado.");
    },
    onError: (e: Error) => toast.error("Não foi possível reabrir", { description: e.message }),
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ds-h3">{c.rotulo}</span>
            <Badge variant={c.congelado ? "default" : "outline"} className="font-normal">
              {SITUACAO_ROTULO[c.situacao] ?? c.situacao}
            </Badge>
            {c.congelado && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Lock className="size-3" aria-hidden />
                congelado
              </Badge>
            )}
          </div>
          <div className="ds-caption mt-1 flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
            <span>
              Folha de <strong>{c.referencia.slice(5, 7)}/{c.referencia.slice(0, 4)}</strong>
            </span>
            <span>
              Produção de {diaParaTexto(diaLocalDe(c.inicio))} a{" "}
              {diaParaTexto(ultimoDiaIncluido(c.fim))}
            </span>
            <span>meta {c.meta_pontos} pontos</span>
          </div>
        </div>
        {podeAdministrar && c.editavel && (
          <Button type="button" variant="outline" size="sm" onClick={aoEditar}>
            <Pencil className="size-4" aria-hidden />
            Editar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Quadro c={c} />
        <div className="rounded-lg border border-border p-3 text-[13px]">
          <span className="ds-label text-muted-foreground">Resultado</span>
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span>Pontos</span>
              <span className="font-medium">{c.pontos}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span>Percentual da meta</span>
              <span className="font-medium">
                {c.percentual === null ? "—" : `${Number(c.percentual).toFixed(2)}%`}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span>Faixa</span>
              <span className={c.faixa_indefinida ? "text-warning" : "font-medium"}>
                {c.faixa_indefinida ? "não definida" : (c.faixa_rotulo ?? "—")}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span>Valor</span>
              {/* NUNCA "R$ 0,00" quando a faixa é indefinida. Zero é um valor
                  decidido; o que existe aqui é ausência de decisão do RH. */}
              <span className={c.faixa_indefinida ? "text-warning" : "font-medium"}>
                {formatarReais(c.valor_reais)}
              </span>
            </div>
          </div>
          {c.faixa_indefinida && (
            <p className="ds-caption mt-2 text-muted-foreground">
              O percentual caiu numa faixa que o RH ainda não definiu. O ciclo pode ser fechado —
              os pontos são definitivos; só o valor fica pendente.
            </p>
          )}
        </div>
      </div>

      {(c.fechado_em || c.observacoes) && (
        <div className="rounded-lg bg-muted/40 p-3 text-[13px] text-muted-foreground">
          {c.fechado_em && (
            <p className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden />
              Fechado por {c.fechado_por_email ?? "—"} em{" "}
              {new Date(c.fechado_em).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
          {c.observacoes && <p className="mt-1 whitespace-pre-wrap">{c.observacoes}</p>}
        </div>
      )}

      {podeAdministrar && (
        <div className="flex flex-wrap items-center gap-2">
          {!c.congelado && (
            <Button
              type="button"
              size="sm"
              disabled={fechar.isPending || c.elegiveis === 0}
              onClick={() => fechar.mutate()}
            >
              <Lock className="size-4" aria-hidden />
              Fechar ciclo
            </Button>
          )}
          {c.situacao === "fechado" && !pedindoMotivo && (
            <Button type="button" size="sm" variant="outline" onClick={() => setPedindoMotivo(true)}>
              <RotateCcw className="size-4" aria-hidden />
              Reabrir
            </Button>
          )}
          {!c.congelado && c.elegiveis === 0 && (
            <span className="ds-caption text-muted-foreground">
              Nada elegível para congelar ainda.
            </span>
          )}
        </div>
      )}

      {pedindoMotivo && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
          <Label>Motivo da reabertura</Label>
          <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">
            Reabrir descarta o resultado congelado. O motivo fica registrado no ciclo, com autor e
            data, e não pode ser apagado.
          </p>
          <Textarea rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={motivo.trim().length < 10 || reabrir.isPending}
              onClick={() => reabrir.mutate()}
            >
              Confirmar reabertura
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setPedindoMotivo(false);
                setMotivo("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function GestaoDeCiclosImpl() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<CicloAdministravel | null>(null);
  const [f, setF] = useState<Formulario>(VAZIO);

  const capacidades = useQuery({
    queryKey: ["relatorio", "minhas-capacidades"],
    queryFn: buscarMinhasCapacidades,
    staleTime: 60_000,
  });

  const ciclos = useQuery({
    queryKey: ["relatorio", "ciclos-administraveis"],
    queryFn: buscarCiclosAdministraveis,
  });

  const podeAdministrar = (capacidades.data ?? []).includes("remuneracao.administrar");

  const salvar = useMutation({
    mutationFn: () => {
      const dados: DadosDoCiclo = {
        rotulo: f.rotulo,
        referencia: f.referencia,
        inicio: primeiroInstante(f.inicioDia),
        fim: limiteExclusivo(f.fimDia),
        meta: Number(f.meta),
      };
      return editando ? editarCiclo(editando.id, dados) : criarCiclo(dados);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["relatorio"] });
      setAberto(false);
      setEditando(null);
      setF(VAZIO);
      toast.success(editando ? "Ciclo atualizado" : "Ciclo criado");
    },
    // A RPC já devolve mensagem em português citando o ciclo em conflito pelo
    // nome. Mostrar como está é mais útil que qualquer texto genérico.
    onError: (e: Error) => toast.error("Não foi possível salvar", { description: e.message }),
  });

  const incompleto =
    f.rotulo.trim().length < 3 ||
    !f.referencia ||
    !f.inicioDia ||
    !f.fimDia ||
    f.fimDia < f.inicioDia ||
    !(Number(f.meta) > 0);

  return (
    <PageShell>
      <PageHeader
        title="Gestão de ciclos"
        subtitle="Períodos de apuração e seus resultados"
        icon={<CalendarClock className="size-6" aria-hidden />}
        breadcrumb={<VoltarParaRelatorios />}
        actions={
          podeAdministrar ? (
            <Button
              type="button"
              onClick={() => {
                setEditando(null);
                setF(VAZIO);
                setAberto(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              Novo ciclo
            </Button>
          ) : undefined
        }
      />

      {!podeAdministrar && !capacidades.isLoading && (
        <Section title="">
          <p className="text-[13px] text-muted-foreground">
            Você pode consultar os ciclos, mas criar, editar, fechar e reabrir exigem a capacidade{" "}
            <code>remuneracao.administrar</code>.
          </p>
        </Section>
      )}

      <Section title="Ciclos">
        {ciclos.isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-2xl" />
            ))}
          </div>
        ) : ciclos.error ? (
          <EmptyPanel
            icon={Lock}
            title="Não foi possível carregar"
            description={(ciclos.error as Error).message}
          />
        ) : (ciclos.data ?? []).length === 0 ? (
          <EmptyPanel
            icon={CalendarClock}
            title="Nenhum ciclo cadastrado"
            description="Crie o primeiro ciclo informando a folha de destino e o período de produção que ela remunera."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {(ciclos.data ?? []).map((c) => (
              <Cartao
                key={c.id}
                c={c}
                podeAdministrar={podeAdministrar}
                aoEditar={() => {
                  setEditando(c);
                  setF(doCiclo(c));
                  setAberto(true);
                }}
              />
            ))}
          </div>
        )}
      </Section>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar ciclo" : "Novo ciclo"}</DialogTitle>
            <DialogDescription>
              A folha de destino e o período de produção são coisas diferentes: a folha de setembro
              pode remunerar trabalho feito em agosto.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="rotulo">Nome do ciclo</Label>
              <Input
                id="rotulo"
                className="mt-1.5"
                placeholder="Setembro/2026"
                value={f.rotulo}
                onChange={(e) => setF({ ...f, rotulo: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="referencia">Referência da folha</Label>
              <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">
                Em qual pagamento este resultado será usado.
              </p>
              <Input
                id="referencia"
                type="month"
                value={f.referencia}
                onChange={(e) => setF({ ...f, referencia: e.target.value })}
              />
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label>Período de produção</Label>
                {f.referencia && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => {
                      const s = sugerir20a19(f.referencia);
                      if (s) setF({ ...f, ...s });
                    }}
                  >
                    sugerir 20 → 19
                  </Button>
                )}
              </div>
              <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">
                Que trabalho entra nesta apuração. Informe o primeiro e o último dia que contam —
                não precisa seguir o padrão do ciclo anterior.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="min-w-[140px] flex-1">
                  <Label htmlFor="de" className="ds-caption font-normal text-muted-foreground">
                    Primeiro dia
                  </Label>
                  <Input
                    id="de"
                    type="date"
                    className="mt-1"
                    value={f.inicioDia}
                    onChange={(e) => setF({ ...f, inicioDia: e.target.value })}
                  />
                </div>
                <div className="min-w-[140px] flex-1">
                  <Label htmlFor="ate" className="ds-caption font-normal text-muted-foreground">
                    Último dia
                  </Label>
                  <Input
                    id="ate"
                    type="date"
                    className="mt-1"
                    value={f.fimDia}
                    onChange={(e) => setF({ ...f, fimDia: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Previa f={f} />

            <div>
              <Label htmlFor="meta">Meta da equipe, em pontos</Label>
              <Input
                id="meta"
                type="number"
                min={1}
                className="mt-1.5 max-w-[160px]"
                value={f.meta}
                onChange={(e) => setF({ ...f, meta: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={incompleto || salvar.isPending || !podeAdministrar}
              onClick={() => salvar.mutate()}
            >
              {editando ? "Salvar alterações" : "Criar ciclo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export const GestaoDeCiclos = memo(GestaoDeCiclosImpl);
