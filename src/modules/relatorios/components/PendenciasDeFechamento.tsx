import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Clock, FileWarning, PencilLine } from "lucide-react";
import { EmptyPanel, KpiRow, PageHeader, PageShell, Section, StatCard } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buscarPendencias, buscarRegistradas, formatarDuracao } from "../services/fechamento-data";
import { formatarData } from "../services/relatorios-service";
import { VoltarParaRelatorios } from "./VoltarParaRelatorios";

const SITUACAO: Record<string, { rotulo: string; variante: "outline" | "secondary" }> = {
  sem_registro: { rotulo: "não iniciado", variante: "outline" },
  rascunho: { rotulo: "rascunho", variante: "secondary" },
};

function PendenciasDeFechamentoImpl() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<"pendentes" | "registradas">("pendentes");

  const consulta = useQuery({
    queryKey: ["relatorio", "pendencias-fechamento"],
    queryFn: () => buscarPendencias(null),
    staleTime: 30_000,
  });

  const registradas = useQuery({
    queryKey: ["relatorio", "fechamentos-registrados"],
    queryFn: buscarRegistradas,
    staleTime: 30_000,
  });

  const lista = consulta.data ?? [];
  const prontas = registradas.data ?? [];
  const noCiclo = lista.filter((p) => p.no_ciclo_aberto).length;
  const rascunhos = lista.filter((p) => p.situacao === "rascunho").length;
  const paradas = lista.filter((p) => p.dias_parada >= 7).length;

  return (
    <PageShell>
      <PageHeader
        breadcrumb={<VoltarParaRelatorios />}
        title="Pendências de fechamento técnico"
        subtitle="Entregas concluídas que ainda não têm o relato registrado. A demanda continua concluída — o que falta é o registro para ela poder ser classificada."
        icon={<ClipboardList className="size-6" aria-hidden />}
      />

      <Section title="Situação">
        <KpiRow>
          <StatCard label="Aguardando registro" value={lista.length} icon={FileWarning} />
          <StatCard
            label="Já registradas"
            value={prontas.length}
            icon={CheckCircle2}
            hint="prontas para classificar"
            tone={prontas.length > 0 ? "success" : "neutral"}
          />
          <StatCard label="Começadas e não terminadas" value={rascunhos} icon={PencilLine} />
          <StatCard
            label="Paradas há 7 dias ou mais"
            value={paradas}
            icon={Clock}
            tone={paradas > 0 ? "warning" : "neutral"}
          />
        </KpiRow>
        {noCiclo > 0 && (
          <p className="ds-caption mt-3 text-muted-foreground">
            {noCiclo} {noCiclo === 1 ? "entrega está" : "entregas estão"} dentro do ciclo em
            aberto — só entram na apuração se o fechamento for registrado.
          </p>
        )}
      </Section>

      {/* As duas listas ficam lado a lado como abas, e não em telas separadas,
          para que registrar uma entrega seja visivelmente MOVER de uma coluna
          para a outra — em vez de fazer a linha desaparecer sem explicação. */}
      <div className="flex gap-1 border-b">
        {([
          ["pendentes", `Aguardando (${lista.length})`],
          ["registradas", `Registradas (${prontas.length})`],
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

      {aba === "registradas" ? (
        <Section
          title="Registradas"
          description="Fechamento técnico preenchido. Estas já podem ser classificadas, e continuam editáveis."
        >
          {prontas.length === 0 ? (
            <EmptyPanel
              icon={CheckCircle2}
              title="Nenhuma registrada ainda"
              description="Ao registrar um fechamento, a entrega aparece aqui."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Demanda</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="w-[120px]">Sistema</TableHead>
                    <TableHead className="w-[110px]">Concluída</TableHead>
                    <TableHead className="w-[90px] text-right">Tempo</TableHead>
                    <TableHead className="w-[130px]">Classificação</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prontas.map((p) => (
                    <TableRow key={p.demanda_id}>
                      <TableCell className="font-mono text-[12px]">{p.ticket_code}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{p.titulo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {p.sistema_slug ?? "não identificado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-[13px]">
                        {formatarData(p.concluida_em)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">
                        {formatarDuracao(p.minutos_lancados)}
                      </TableCell>
                      <TableCell>
                        {p.ja_classificada ? (
                          <Badge className="font-normal">classificada</Badge>
                        ) : (
                          <span className="text-[13px] text-muted-foreground">aguardando</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/relatorios/fechamento/${p.demanda_id}`)}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Section>
      ) : (
      <Section title="Aguardando registro">
        {consulta.error ? (
          <EmptyPanel
            icon={FileWarning}
            title="Não foi possível carregar"
            description={(consulta.error as Error).message}
          />
        ) : consulta.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <EmptyPanel
            icon={ClipboardList}
            title="Nada pendente"
            description="Todas as entregas concluídas já têm o fechamento técnico registrado."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">Demanda</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-[120px]">Sistema</TableHead>
                  <TableHead className="w-[110px]">Concluída</TableHead>
                  <TableHead className="w-[90px] text-right">Parada há</TableHead>
                  <TableHead className="w-[90px] text-right">Tempo</TableHead>
                  <TableHead className="w-[120px]">Registro</TableHead>
                  <TableHead className="w-[110px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((p) => {
                  const s = SITUACAO[p.situacao] ?? SITUACAO.sem_registro;
                  return (
                    <TableRow key={p.demanda_id}>
                      <TableCell className="font-mono text-[12px]">{p.ticket_code}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{p.titulo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {p.sistema_slug ?? "não identificado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-[13px]">
                        {formatarData(p.concluida_em)}
                      </TableCell>
                      <TableCell
                        className={[
                          "text-right tabular-nums text-[13px]",
                          p.dias_parada >= 7 ? "text-warning" : "",
                        ].join(" ")}
                      >
                        {p.dias_parada === 0 ? "hoje" : `${p.dias_parada}d`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[13px]">
                        {formatarDuracao(p.minutos_lancados)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.variante} className="font-normal">
                          {s.rotulo}
                        </Badge>
                        {p.no_ciclo_aberto && (
                          <span
                            className="ml-1.5 text-[11px] text-muted-foreground"
                            title="Está no ciclo em aberto"
                          >
                            ciclo
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={p.situacao === "rascunho" ? "default" : "outline"}
                          onClick={() => navigate(`/relatorios/fechamento/${p.demanda_id}`)}
                        >
                          {p.situacao === "rascunho" ? "Continuar" : "Registrar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
      )}
    </PageShell>
  );
}

export default memo(PendenciasDeFechamentoImpl);
export { PendenciasDeFechamentoImpl as PendenciasDeFechamento };
