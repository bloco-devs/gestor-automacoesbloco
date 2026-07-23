# 48 — AdminHub 2.0 · Arquitetura & Reutilização

## Objetivo

Consolidação **exclusivamente visual** da superfície administrativa. Nenhum backend, migration, RPC ou Edge Function foi criado. Toda funcionalidade existente permanece disponível nas mesmas rotas.

## Arquitetura

```text
src/modules/admin-shell/
├── AdminShellPage.tsx           # página raiz (/admin)
├── index.ts                     # fachada pública
├── layout/
│   └── AdminShellLayout.tsx     # topbar + sidebar + main + painel contextual
├── navigation/
│   └── registry.ts              # ADMIN_GROUPS, ADMIN_NAV, ADMIN_QUICK_ACTIONS
├── components/
│   ├── AdminSidebar.tsx         # nav agrupada
│   ├── AdminSearch.tsx          # busca client-side
│   ├── AdminBreadcrumb.tsx      # rastro derivado da rota
│   ├── AdminQuickActions.tsx    # atalhos fixos
│   └── AdminContextPanel.tsx    # descrição, dependências, relacionados
├── hooks/
│   └── useAdminRoute.ts         # resolve item ativo por pathname
├── utils/
│   └── search.ts                # matcher com normalização de diacríticos
├── types/
│   └── index.ts
└── __tests__/registry.test.ts
```

## Mapa de agrupamento

- **PLATAFORMA** — Centro de Saúde, Analytics, Observabilidade IA, Dashboard Admin, Logs/Auditoria.
- **IA & CONHECIMENTO** — Base de Conhecimento, Roteamento, Workflows, Consolidação.
- **OPERACIONAL** — Integrações, Webhooks, SLA, Portal, Board de Demandas.
- **SEGURANÇA** — Usuários, Papéis, Permissões, Sessões.
- **DESENVOLVIMENTO** — Diagramas, Ecossistema, Variáveis, Debug, AdminHub legado.

## Reutilização

- **DS 2.0**: `PageShell` (indireto via layout), `Section`, `Card`, `Badge`, `Button`, `Sheet` — sem novos tokens.
- **Feature Flags**: `useFeatureFlags` + `ALL_FLAGS` mantidos idênticos.
- **Rotas**: 100% preservadas. `/admin` passa a renderizar `AdminShellPage`. O hub anterior continua acessível em **`/admin/legado`**.
- **Sidebar do app** e demais layouts principais permanecem inalterados.

## Fluxo

1. Usuário entra em `/admin` → `AdminShellPage` monta o `AdminShellLayout`.
2. `useAdminRoute` resolve o item ativo por pathname para alimentar breadcrumb e painel contextual.
3. `AdminSearch` filtra o registry estático localmente (sem rede).
4. Cliques em cartões/menu navegam para as rotas existentes — nenhuma lógica de negócio é alterada.

## Responsividade

- **Desktop (lg ≥ 1024px)**: 3 colunas — Sidebar · Conteúdo · Painel contextual.
- **Tablet (md)**: 2 colunas — Conteúdo + painel contextual escondido (acesso via cartões).
- **Mobile**: sidebar em `Sheet` (drawer), topbar mantém busca + breadcrumb.

## Acessibilidade

- `nav` com `aria-label`, `aria-current="page"` no item ativo.
- Foco visível (`focus-visible:ring-2 ring-ring`).
- Search com `role="searchbox"`, resultados em `role="listbox"`/`role="option"`.
- Drawer via shadcn `Sheet` (focus trap nativo + Esc para fechar).

## Performance

- `AdminSidebar` e `AdminShellLayout` memoizados.
- Resultados de busca via `useMemo`.
- Página carregada por `React.lazy` no `App.tsx` (chunk `admin`).
- Nenhuma consulta de rede é adicionada.

## Roadmap curto

1. Registrar prompts IA e Variáveis dedicadas quando os módulos tiverem UIs próprias.
2. Adicionar histórico/favoritos por usuário (localStorage) para atalhos.
3. Integrar contadores de saúde no cartão do "Centro de Saúde" a partir do módulo `operations`.

## Restrições respeitadas

Zero migrations · zero Edge Functions · zero RPCs · zero backend · zero mudança em Workflow/Routing/AI/Portal/Operations/Analytics/Context Engine/Platform/UX.
