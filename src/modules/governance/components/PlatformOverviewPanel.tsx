import { memo } from "react";
import { Section, StatCard, KpiRow } from "@/design-system";
import { INVENTORY } from "../catalog/inventory";

export const PlatformOverviewPanel = memo(function PlatformOverviewPanel() {
  return (
    <Section title="Platform Overview" description="Resumo executivo em números — somente leitura.">
      <KpiRow>
        {INVENTORY.map((s) => (
          <StatCard key={s.key} label={s.label} value={String(s.count)} hint={s.description} />
        ))}
      </KpiRow>
    </Section>
  );
});
