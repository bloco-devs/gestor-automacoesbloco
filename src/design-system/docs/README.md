# src/design-system — DS 2.0

Fonte única de verdade para primitivos de layout e patterns de UI padronizados. Documentação completa em [`docs/34-Design-System-2.md`](../../../docs/34-Design-System-2.md).

## Regras

- **Não** importar cores/HSL literais — usar tokens semânticos (`bg-primary`, `text-muted-foreground`).
- **Não** substituir componentes shadcn — os patterns aqui **compõem** `Card`, `Button`, etc.
- **Adição incremental**: consumidores migram por onda, não em massa.

## Estrutura

```
tokens/     valores primitivos (spacing, tipografia, radius, elevação, motion)
layout/     PageShell, PageHeader, Section, Toolbar
patterns/   StatCard, KpiRow, EmptyPanel
```

## Uso mínimo

```tsx
import { PageShell, PageHeader, Section, StatCard, KpiRow } from "@/design-system";

<PageShell>
  <PageHeader title="Operações" subtitle="Visão em tempo real" />
  <Section title="Resumo">
    <KpiRow>
      <StatCard label="Abertas" value={12} />
    </KpiRow>
  </Section>
</PageShell>
```
