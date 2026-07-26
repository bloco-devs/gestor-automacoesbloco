import { memo } from "react";
import { StatCard, type StatTone } from "@/design-system";
import { greeting } from "../utils/format";
import type { InboxSummaryCounts } from "../types";

interface Props {
  name: string;
  counts: InboxSummaryCounts;
}

/**
 * DS 3.0 — os quatro contadores deixaram de ser cards com ícone colorido dentro
 * de um quadradinho e viraram blocos tipográficos (StatCard). A cor só aparece
 * quando o número significa algo: "Críticos" fica vermelho apenas se houver
 * algum, e "Concluídos hoje" fica verde apenas se houver algum. Zero é neutro —
 * um contador zerado não precisa chamar atenção.
 */
const chips: Array<{
  key: keyof Omit<InboxSummaryCounts, "total">;
  label: string;
  toneWhenPositive: StatTone;
}> = [
  { key: "critical", label: "Críticos", toneWhenPositive: "danger" },
  { key: "inProgress", label: "Em andamento", toneWhenPositive: "neutral" },
  { key: "waitingQa", label: "Aguardando QA", toneWhenPositive: "neutral" },
  { key: "doneToday", label: "Concluídos hoje", toneWhenPositive: "success" },
];

function HeroSummary({ name, counts }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="ds-h1">
          {greeting()}, {name} <span aria-hidden>👋</span>
        </h1>
        <p className="ds-caption text-muted-foreground">Seu trabalho de hoje, em ordem de prioridade.</p>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        {chips.map((c) => {
          const value = counts[c.key];
          return (
            <StatCard
              key={c.key}
              label={c.label}
              value={value}
              tone={value > 0 ? c.toneWhenPositive : "neutral"}
            />
          );
        })}
      </div>
    </div>
  );
}

export default memo(HeroSummary);
