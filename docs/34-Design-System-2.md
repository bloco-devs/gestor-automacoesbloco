# Design System 2.0 — Bloco

> **Status**: Em construção (Feature 009). Evolução aditiva do DS atual (`docs/15-Design-System.md`), sem substituir tokens ou paleta institucional.

## Índice
- [Objetivos](#objetivos)
- [Onda 0 — Auditoria](#onda-0--auditoria)
- [Tokens](#tokens)
- [Tipografia](#tipografia)
- [Grid & Espaçamento](#grid--espaçamento)
- [Elevação](#elevação)
- [Motion](#motion)
- [Layout Primitives](#layout-primitives)
- [Patterns](#patterns)
- [Sidebar](#sidebar)
- [Checklist UX](#checklist-ux)

## Objetivos

Consolidar UX/UI da plataforma em um único produto coeso, sem alterar regras de negócio, engines ou fluxos administrativos. Regras invioláveis em `.lovable/plan.md`.

## Onda 0 — Auditoria

Varredura executada em `2026-07-22`. Escopo: identificar dívidas visuais antes de qualquer refactor. **Nenhum código foi alterado nesta onda.**

### Tamanhos de fonte ad-hoc (`text-[Npx]`)
Ocorrências principais fora do sistema tipográfico:
- **`text-[10px]`**: `NotificacoesBell`, `NotificationsDrawer`, `PortalIndex.tsx:135`, `Kanban.tsx:256,260`, `NovaSolicitacao.tsx:242,407`, `admin/Webhooks.tsx:167,222`, `admin/Configuracoes.tsx:485`, `AtividadesBoard.tsx:634,640,750,808`, `admin/WorkflowExecutions.tsx:46`.
- **`text-[11px]`**: `SolucoesKanban.tsx:261`, `SolicitacaoDetail.tsx:860,894,912,955`, `NovaSolicitacao.tsx:255`, `NotificacoesBell.tsx:84`, `GanttChart.tsx:144,167,175,215,269,278`.

Migrar todos para `.ds-caption` (11–12px) ou `.ds-label` (10px uppercase) na Onda 4/5.

### Dashboards / KPIs redundantes
- `MetricCard` (Operações), `HealthCard` (Operações), `MetricsOverview` (Dashboard), `HeroSummary` (Inbox) implementam variações do mesmo padrão "número grande + label + hint".
- KPIs sobrepostos: **Abertas**, **SLA %**, **Concluídas hoje** aparecem em ≥3 telas (Dashboard, Operações, admin/Dashboard) com formatação distinta.
- **Ação (Onda 5)**: unificar em `patterns/StatCard` + `KpiRow`. Não remover métricas; só padronizar visual.

### Cards / headers inconsistentes
- Padding de header oscila entre `p-4`, `p-6`, `px-4 py-3`, `px-5 py-4` em `src/pages/**` e `src/modules/**`.
- Radius: mistura `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`.
- **Ação (Onda 2)**: padronizar `card.tsx` para `rounded-2xl` + padding uniforme; consumidores herdam automaticamente.

### Botões
- Alturas variando entre `h-6`, `h-7`, `h-8`, `h-9`, `h-10`, `h-11` sem racional.
- Ícones-only em vários pontos sem `aria-label` (visto em `GanttChart.tsx:215`, alguns triggers de menu).
- **Ação (Onda 2 + 6)**: normalizar variantes `sm/default/lg` = 32/40/44 e cobrir a11y na Onda 6.

### Sidebar
- `src/components/AppLayout.tsx` (637 linhas) lista **20+ rotas planas** por persona (`gestor`, `solicitante`, `builder`) sem agrupamento visual. Rotas admin misturadas com trabalho diário.
- Nenhum `SidebarGroup` em uso; navegação atual é `NavLink` puro.
- **Ação (Onda 3)**: agrupar em `TRABALHO / ATENDIMENTO / ADMINISTRAÇÃO` mantendo **todas as rotas** e regras de persona.

### Espaçamentos fora da escala
- Uso esporádico de `mt-0.5`, `mt-1.5`, `gap-1.5`, `p-3` (12px — dentro da escala), mas também `p-5` (20px — fora), `mx-1.5`. Aceitável em widgets muito densos; documentar exceção.

### Tipografia
- Fonte de marca `NewBlackTypeface` carregada mas raramente usada fora de `.font-brand`. Títulos das páginas usam `text-2xl md:text-3xl font-semibold` inline — **10+ variações**.
- **Ação (Onda 1)**: introduzir classes `.ds-*` mapeadas à fonte de marca; Onda 4 aplica nos wrappers de página.

### Duplicações estruturais
- Wrapper de página `p-4 md:p-6 space-y-6 max-w-[Npx] mx-auto` repetido em ~15 páginas com valores levemente diferentes (`1400`, `1600`, `1920`).
- **Ação (Onda 1 + 4)**: `PageShell` + `PageHeader` centralizam o molde.

## Tokens

Todos os tokens de **cor** vivem em `src/index.css` (HSL) e permanecem inalterados. DS 2.0 adiciona:

```css
--elev-1: 0 1px 2px hsl(0 0% 0% / 0.06), 0 1px 3px hsl(0 0% 0% / 0.04);
--elev-2: 0 4px 12px hsl(0 0% 0% / 0.08), 0 2px 4px hsl(0 0% 0% / 0.04);
--elev-3: 0 12px 32px hsl(0 0% 0% / 0.14), 0 4px 12px hsl(0 0% 0% / 0.06);

--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized: cubic-bezier(0.3, 0, 0, 1);
--dur-fast: 120ms;
--dur-base: 200ms;
--dur-slow: 320ms;
```

## Tipografia

Classes utilitárias oficiais (definidas em `index.css`, camada `utilities`). **Não usar** `text-[Npx]` nem `text-2xl` avulsos em código novo.

| Classe | Uso | Tamanho | Peso |
| --- | --- | --- | --- |
| `.ds-display` | Hero, splash | 40/48 | 700 |
| `.ds-h1` | Título de página | 28/32 | 600 |
| `.ds-h2` | Título de seção | 22/28 | 600 |
| `.ds-h3` | Subtítulo | 18/24 | 600 |
| `.ds-card-title` | Título de card | 16/22 | 600 |
| `.ds-body` | Corpo padrão | 14/20 | 400 |
| `.ds-body-strong` | Corpo destacado | 14/20 | 600 |
| `.ds-caption` | Texto secundário | 12/16 | 400 |
| `.ds-label` | Rótulo curto uppercase | 11/14 | 600 (upper) |
| `.ds-helper` | Ajuda de formulário | 12/16 | 400 (muted) |

## Grid & Espaçamento

Escala oficial (Tailwind default já cobre): **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px**. Não usar valores intermediários fora dessa escala.

- Container: `container mx-auto px-4 md:px-6 lg:px-8` (via `PageShell`).
- Gaps padrão: `gap-3` (12px) intra-widget, `gap-4` (16px) entre cards, `gap-6` (24px) entre seções.

## Elevação

- `shadow-elev-1`: cards em repouso.
- `shadow-elev-2`: hover, popovers, sheets pequenos.
- `shadow-elev-3`: dialogs, drawers, overlays fullscreen.

## Motion

- Hover/press: `duration-fast ease-standard`.
- Fade/collapse: `duration-base ease-standard`.
- Sheets/dialogs: `duration-slow ease-emphasized`.

## Layout Primitives

Em `src/design-system/layout/`:
- `PageShell` — container principal com `max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-6`.
- `PageHeader` — bloco de título/subtítulo/ações (breadcrumb opcional).
- `Section` — bloco vertical com `space-y-4` e título opcional.
- `Toolbar` — barra horizontal `flex items-center justify-between gap-3 flex-wrap`.

## Patterns

Em `src/design-system/patterns/`:
- `StatCard` — número + label + ícone + hint + tone (success/warning/danger/info/neutral).
- `KpiRow` — grid responsivo (2 → 3 → 4 → 6 colunas) para KPIs.
- `EmptyPanel` — estado vazio consistente (ícone, título, descrição, CTA opcional).

Não substituem componentes existentes na Onda 1. Adotados progressivamente nas Ondas 4–5.

## Sidebar

Onda 3. Agrupamento oficial (rotas atuais preservadas):

- **TRABALHO** — Portal, Inbox, Dashboard (persona), Minhas Solicitações, Nova Solicitação.
- **DEMANDAS & SOLUÇÕES** — Lista/Kanban/Gantt de Solicitações e Soluções, Consolidação, Atividades.
- **ATENDIMENTO** — Base de Conhecimento, Board de Demandas, Centro de Operações.
- **ADMINISTRAÇÃO** — Workflows, SLA, Webhooks & Integrações, Diagrama, Observabilidade IA, Dashboard (Operação), Configurações.
- **AJUDA** — Ajuda.

Cada grupo colapsável. Grupo contendo rota ativa auto-expandido. Estado persistido em `ds2:sidebar:<groupId>`.

## Checklist UX

Ao criar/alterar tela:
- [ ] Usa `PageShell` + `PageHeader`?
- [ ] Tipografia via `.ds-*` ou tokens shadcn (nunca `text-[Npx]`)?
- [ ] Cards via `<Card>` (radius/padding/shadow herdados)?
- [ ] Botões via variantes shadcn (sem `h-6/h-7/h-9` avulsos)?
- [ ] Espaçamentos na escala 4/8/12/16/24/32/48/64?
- [ ] Ícones-only têm `aria-label`?
- [ ] Foco visível (`focus-visible:ring-2`)?
- [ ] Nenhum comportamento/regra de negócio alterado?

## Onda 2 — Refinamento dos Primitivos

Refinamento aditivo em `src/components/ui/`. **Nenhuma API pública alterada**; consumidores herdam o novo visual automaticamente.

### Button
- Alturas normalizadas: `sm` = 32px, `default` = 40px, `lg` = 44px.
- Novos tamanhos aditivos: `icon-sm` (32), `icon-lg` (44), `fab` (56).
- Nova variante `fab` (Floating Action Button) com `rounded-full` + `shadow-elev-2`.
- Radius via token (`rounded-lg`).
- Focus: `ring-2 ring-ring/60 ring-offset-2` (mais suave, alto contraste).
- Motion: `transition-[…] duration-fast ease-standard`, `active:translate-y-px`.
- Variantes existentes (`default/destructive/outline/secondary/ghost/link`) preservadas.

### Card
- `rounded-2xl` + `shadow-elev-1` default, `hover:shadow-elev-2` (`duration-base ease-standard`).
- Padding uniforme `p-5` em Header/Content/Footer.
- `CardTitle` migra para `.ds-card-title`; `CardDescription` para `.ds-caption`.

### Input / Textarea / SelectTrigger
- Altura 40px, radius `rounded-lg`.
- Placeholder padronizado (`text-muted-foreground/70`).
- Focus unificado com Button (`ring-ring/60` + `border-ring/60`).
- Motion: `transition-[border-color,box-shadow] duration-fast ease-standard`.
- `SelectContent` migrado para `rounded-xl` + `shadow-elev-2`.

### Badge
- Variantes semânticas oficiais adicionadas: `success`, `warning`, `danger`, `info`, `neutral`, `primary`.
- Variantes legadas (`default`, `secondary`, `destructive`, `outline`) preservadas — `danger` é alias de `destructive`, `primary` de `default`.
- Focus alinhado (`ring-2 ring-ring/60`).

### Skeleton
- `rounded-lg` (alinhado a inputs/cards internos).
- Animação `animate-pulse` mantida.

### Separator / ScrollArea / Label
- APIs mantidas. Sem mudanças de estilo relevantes — já estavam consistentes com tokens semânticos.

### Tokens consumidos
- `shadow-elev-1`, `shadow-elev-2`, `shadow-elev-3` (Onda 1).
- `duration-fast` / `duration-base`, `ease-standard` (Onda 1).
- `.ds-card-title` / `.ds-caption` (Onda 1).
- Cores semânticas existentes (`success`, `warning`, `info`, `destructive`).

### Garantias
- Zero mudanças em módulos, páginas, hooks, providers, engines, rotas.
- APIs, props e exports 100% preservados.
- 167/167 testes verdes.

## Onda 3 — Sidebar Inteligente + Navegação Consolidada

Reorganização puramente visual do menu lateral. Nenhuma rota, permissão, página, hook, provider ou engine foi alterada.

### Estrutura da Sidebar
Os itens de navegação passam a ser distribuídos em grupos temáticos, cada um com título, ícone Lucide e conteúdo colapsável com animação suave (grid-rows transition, `duration-200 ease-out`).

Grupos por papel (definidos em `src/components/sidebar/navGroups.ts`):

- **Developer/Admin**
  - `Trabalho`: Inbox, Dashboard, Solicitações (Lista/Kanban/Gantt), Atividades
  - `Atendimento`: Base de Conhecimento, Board de Demandas, Centro de Operações
  - `Automações`: Workflows, Soluções (Lista/Kanban/Gantt), Diagrama, Observabilidade IA, Consolidação
  - `Administração`: Dashboard (Operação), Configuração de SLA, Webhooks & Integrações, Configurações
  - `Suporte`: Ajuda
- **Requester**
  - `Trabalho`: Portal, Inbox, Dashboard, Minhas Solicitações, Nova Solicitação, Solicitações
  - `Suporte`: Ajuda
- **Builder**
  - `Trabalho`: Inbox, Dashboard, Minhas Solicitações, Nova Solicitação, Solicitações
  - `Automações`: Soluções, Diagrama
  - `Suporte`: Ajuda

Todos os menus existentes foram preservados; apenas o agrupamento mudou.

### Componentes
- `src/components/sidebar/navGroups.ts` — configuração declarativa dos grupos e helper `findActive(groups, pathname)`.
- `src/components/sidebar/SidebarGroupsNav.tsx` — renderiza grupos + itens; memoizado para evitar renders extras.
- `src/components/sidebar/SidebarBreadcrumb.tsx` — breadcrumb automático `Grupo › Item › Sub-item` derivado da rota atual.

### Comportamento
- Grupo que contém a rota atual: **expandido automaticamente**.
- Demais grupos: **colapsados por padrão**.
- Toggle manual sobrescreve a preferência (persistida). Ao navegar para um grupo colapsado, ele reabre.

### Persistência
- Chave: `ds2:sidebar:<grupoId>` (`"1"` = aberto, `"0"` = fechado).
- Nenhuma outra chave de `localStorage` foi alterada. `app:sidebarWidth`, `app:sidebarHidden` e as demais permanecem intactas.

### Header + Breadcrumb
- Novo cabeçalho fixo (desktop) com `SidebarBreadcrumb` sobre `backdrop-blur` + borda `border-b/60`.
- Cabeçalho mobile mantém trigger de drawer, notificações, tour, tema e logout.

### Hierarquia visual
- Página atual: `bg-sidebar-accent` + borda + `aria-current="page"`.
- Grupo atual: label e ícone com contraste normal; grupos inativos ficam em `text-muted-foreground` e itens com opacidade reduzida (`dim`).
- Ações principais (perfil, notificações, sair) permanecem no rodapé da sidebar.

### Ícones
- Somente Lucide. Tamanho unificado (`size-3.5`/`size-4`) e alinhamento consistente em todos os grupos e itens.

### Responsividade
- **Desktop**: sidebar tradicional redimensionável (persistência `app:sidebarWidth`).
- **Tablet/Mobile**: drawer com overlay (`fixed inset-y-0 left-0 w-72`), fecha ao navegar.
- Botão "Esconder barra lateral" continua disponível no desktop, com botão flutuante para reexibir.

### Acessibilidade
- Cada grupo: `aria-expanded`, `aria-controls`, `aria-label` descritivo.
- Itens de menu: `aria-current="page"` quando ativos.
- `focus-visible:ring-2 ring-ring/60` em todos os elementos interativos da sidebar.
- Toda a navegação por teclado herdada (Tab / Enter / setas do resizer) preservada.

### Performance
- `SidebarGroupsNav` é `React.memo`; cada grupo mantém seu próprio estado local.
- `findActive` roda em `useMemo` por render de sidebar; O(grupos × itens) — trivial.

### Nota sobre reordenação por drag
O drag-and-drop de itens de topo da Onda anterior foi **superado** pela nova arquitetura de grupos. A ordem passa a ser semântica (por grupo) em vez de personalizada. Isso não altera regras de negócio nem esconde funcionalidades — todas as rotas continuam alcançáveis.

### Garantias
- Todas as rotas preservadas (nenhuma alteração em `App.tsx`).
- Nenhum hook, provider, engine, service ou edge function alterado.
- Typecheck limpo. 167/167 testes verdes.
