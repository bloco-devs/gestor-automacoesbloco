import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, CalendarClock, ClipboardList, Coins, FileSearch, FileText, Lock, Scale } from "lucide-react";
import { EmptyPanel, PageHeader, PageShell, Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { buscarCiclos, buscarMinhasCapacidades } from "../services/relatorios-data";
import { formatarData } from "../services/relatorios-service";

interface Cartao {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  icone: typeof FileSearch;
  capacidade: string;
  /** Quando falso, o cartão aparece marcado como ainda não construído. */
  pronto: boolean;
}

const CARTOES: Cartao[] = [
  {
    id: "implementacoes",
    titulo: "Implementações",
    descricao:
      "O que foi entregue por período, sistema e pessoa. Períodos cronológicos, do dia 1 ao último dia do mês.",
    href: "/relatorios/implementacoes",
    icone: FileSearch,
    capacidade: "relatorios.ver",
    pronto: true,
  },
  {
    id: "pendencias",
    titulo: "Pendências de fechamento",
    descricao:
      "Entregas concluídas que ainda não têm o relato técnico registrado. É o que falta para elas poderem ser classificadas.",
    href: "/relatorios/pendencias",
    icone: ClipboardList,
    capacidade: "relatorios.ver",
    pronto: true,
  },
  {
    id: "classificacao",
    titulo: "Classificação",
    descricao:
      "Definir Fácil, Médio ou Difícil com justificativa. Só aparecem aqui as entregas com fechamento registrado.",
    href: "/relatorios/classificacao",
    icone: Scale,
    capacidade: "classificacao.definir",
    pronto: true,
  },
  {
    id: "executivo",
    titulo: "Relatório Executivo",
    descricao:
      "Relatório oficial de apuração para o RH e Diretoria com resumo, equipe, atividades, pendências e auditoria.",
    href: "/relatorios/executivo",
    icone: FileText,
    capacidade: "relatorios.ver",
    pronto: true,
  },
  {
    id: "remuneracao",
    titulo: "Remuneração variável",
    descricao:
      "Apuração por ciclo, do dia 20 ao dia 19. Pontos, meta da equipe, alcance e faixa.",
    href: "/relatorios/remuneracao",
    icone: Coins,
    capacidade: "remuneracao.ver_propria",
    pronto: true,
  },
  {
    id: "fechamentos",
    titulo: "Histórico de ciclos",
    descricao: "Ciclos anteriores, o que entrou em cada um e o resultado congelado na aprovação.",
    href: "/relatorios/ciclos",
    icone: CalendarClock,
    capacidade: "remuneracao.ver_todas",
    pronto: false,
  },
  {
    id: "painel",
    titulo: "Painel",
    descricao: "Entregas por mês, por sistema e por pessoa, com a distribuição das classificações.",
    href: "/relatorios/painel",
    icone: BarChart3,
    capacidade: "relatorios.ver",
    pronto: false,
  },
];

function RelatoriosHubImpl() {
  const navigate = useNavigate();

  const capacidades = useQuery({
    queryKey: ["relatorio", "minhas-capacidades"],
    queryFn: buscarMinhasCapacidades,
    staleTime: 60_000,
  });

  const ciclos = useQuery({
    queryKey: ["relatorio", "ciclos"],
    queryFn: buscarCiclos,
    staleTime: 60_000,
  });

  const minhas = new Set(capacidades.data ?? []);
  const podeVer = (c: Cartao) => minhas.has(c.capacidade);
  const cicloAtual = ciclos.data?.[0];

  // Sem nenhuma capacidade não há o que mostrar — e é melhor dizer isso do que
  // exibir uma grade de cartões que dão erro ao clicar.
  if (!capacidades.isLoading && minhas.size === 0) {
    return (
      <PageShell>
        <PageHeader title="Relatórios" icon={<FileSearch className="size-6" aria-hidden />} />
        <EmptyPanel
          icon={Lock}
          title="Você ainda não tem acesso aos relatórios"
          description="O acesso é concedido por capacidade, separado do seu perfil normal no sistema. Peça a um administrador."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Relatórios"
        subtitle="Histórico técnico das implementações e apuração da remuneração variável."
        icon={<FileSearch className="size-6" aria-hidden />}
      />

      {cicloAtual && (
        <Section title="Ciclo em aberto">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="ds-h3">{cicloAtual.rotulo}</span>
            <span className="text-[13px] text-muted-foreground">
              {formatarData(cicloAtual.inicio)} a{" "}
              {formatarData(new Date(new Date(cicloAtual.fim).getTime() - 1).toISOString())}
            </span>
            <span className="text-[13px] text-muted-foreground">
              meta {cicloAtual.metaPontos} pontos
            </span>
            <Badge variant="outline" className="font-normal">
              {cicloAtual.situacao === "aberto" ? "aberto" : cicloAtual.situacao}
            </Badge>
          </div>
        </Section>
      )}

      <Section title="Relatórios disponíveis">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CARTOES.map((c) => {
            const liberado = podeVer(c) && c.pronto;
            const Icone = c.icone;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!liberado}
                onClick={() => navigate(c.href)}
                className={[
                  "flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                  liberado ? "hover:bg-accent" : "cursor-not-allowed opacity-55",
                ].join(" ")}
              >
                <Icone className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="ds-h3">{c.titulo}</span>
                    {!c.pronto && (
                      <Badge variant="secondary" className="font-normal">
                        em construção
                      </Badge>
                    )}
                    {c.pronto && !podeVer(c) && (
                      <Badge variant="outline" className="font-normal">
                        sem acesso
                      </Badge>
                    )}
                  </div>
                  <p className="ds-caption mt-1 text-muted-foreground">{c.descricao}</p>
                </div>
                {liberado && (
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </Section>
    </PageShell>
  );
}

export default memo(RelatoriosHubImpl);
export { RelatoriosHubImpl as RelatoriosHub };
