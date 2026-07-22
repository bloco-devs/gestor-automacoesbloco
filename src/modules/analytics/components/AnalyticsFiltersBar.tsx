import { Printer, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toolbar } from "@/design-system";
import type { AnalyticsFilters, AnalyticsPeriod } from "../types";
import type {
  DemandPriority,
  DemandStatus,
  DemandType,
  UserProfileLite,
} from "@/modules/demands/types";

interface Props {
  filters: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  onExport: () => void;
  onPrint: () => void;
  onRefresh: () => void;
  loading?: boolean;
  systems: Array<{ id: string; nome: string }>;
  responsaveis: UserProfileLite[];
}

const PERIODS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
];

const STATUS_OPTS: Array<{ value: DemandStatus; label: string }> = [
  { value: "backlog", label: "Backlog" },
  { value: "a_fazer", label: "A fazer" },
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "em_testes", label: "Em testes" },
  { value: "homologacao", label: "Homologação" },
  { value: "concluido", label: "Concluído" },
];

const PRIORITY_OPTS: Array<{ value: DemandPriority; label: string }> = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

const TYPE_OPTS: Array<{ value: DemandType; label: string }> = [
  { value: "bug", label: "Bug" },
  { value: "melhoria", label: "Melhoria" },
  { value: "nova_funcionalidade", label: "Nova funcionalidade" },
  { value: "refatoracao", label: "Refatoração" },
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "automacao", label: "Automação" },
];

const ALL = "__all__";

function normalize(v: string): string | null {
  return v === ALL ? null : v;
}

export function AnalyticsFiltersBar({
  filters,
  onChange,
  onExport,
  onPrint,
  onRefresh,
  loading,
  systems,
  responsaveis,
}: Props) {
  return (
    <Toolbar aria-label="Filtros de Analytics" className="print:hidden">
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={filters.period}
          onValueChange={(v) => onChange({ ...filters, period: v as AnalyticsPeriod })}
        >
          <SelectTrigger className="w-[180px]" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.systemId ?? ALL}
          onValueChange={(v) => onChange({ ...filters, systemId: normalize(v) })}
        >
          <SelectTrigger className="w-[180px]" aria-label="Sistema">
            <SelectValue placeholder="Sistema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os sistemas</SelectItem>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.assignedTo ?? ALL}
          onValueChange={(v) => onChange({ ...filters, assignedTo: normalize(v) })}
        >
          <SelectTrigger className="w-[200px]" aria-label="Responsável">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            {responsaveis.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome ?? p.email ?? p.id.slice(0, 6)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority ?? ALL}
          onValueChange={(v) => onChange({ ...filters, priority: normalize(v) as DemandPriority | null })}
        >
          <SelectTrigger className="w-[140px]" aria-label="Prioridade">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas prioridades</SelectItem>
            {PRIORITY_OPTS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type ?? ALL}
          onValueChange={(v) => onChange({ ...filters, type: normalize(v) as DemandType | null })}
        >
          <SelectTrigger className="w-[170px]" aria-label="Tipo">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {TYPE_OPTS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? ALL}
          onValueChange={(v) => onChange({ ...filters, status: normalize(v) as DemandStatus | null })}
        >
          <SelectTrigger className="w-[170px]" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {STATUS_OPTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} aria-label="Atualizar">
          <RefreshCw className={"mr-2 h-4 w-4" + (loading ? " animate-spin" : "")} aria-hidden />
          Atualizar
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} aria-label="Exportar CSV">
          <Download className="mr-2 h-4 w-4" aria-hidden />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onPrint} aria-label="Imprimir">
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          Imprimir
        </Button>
      </div>
    </Toolbar>
  );
}
