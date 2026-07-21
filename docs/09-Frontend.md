# Frontend

## Índice
- [Estrutura](#estrutura)
- [Rotas](#rotas)
- [Providers e contextos](#providers-e-contextos)
- [Hooks](#hooks)
- [Componentes proprietários](#componentes-proprietários)
- [Componentes shadcn](#componentes-shadcn)
- [Padrões](#padrões)
- [Convenções](#convenções)

## Estrutura
```text
src/
├─ App.tsx, main.tsx, index.css
├─ assets/            # logo + fonte NewBlackTypeface
├─ components/
│   ├─ ui/            # 48 shadcn
│   ├─ atividades/    # CardDialog + dialog/ + kanban/ + quadros/ + importar/
│   ├─ diagrama/, perfil/, minhas-solicitacoes/
│   └─ *.tsx          # compartilhados (AppLayout, ProtectedRoute, ...)
├─ hooks/
├─ integrations/supabase/  # client.ts + types.ts (gerado)
├─ lib/               # utils, atividades, importador/, __tests__/
├─ pages/             # 27 páginas
└─ test/
```

## Rotas
Definidas em `src/App.tsx`. Todas as rotas de app ficam dentro de `AppLayout` protegido por `ProtectedRoute`. Ver detalhamento em [07-Módulos](07-Modulos.md).

## Providers e contextos
| Provider | Papel |
| --- | --- |
| `QueryClientProvider` | Cache TanStack Query |
| `TooltipProvider` | Tooltips shadcn |
| `BrowserRouter` | Roteamento |
| `AuthProvider` | Sessão, profile, `viewAs`, `signIn/signOut` |
| `Toaster` + `Sonner` | Notificações |
| `RecoveryGuard` | Intercepta fluxo de recuperação de senha |
| `useTheme` | Dark/Light mode |

## Hooks
| Hook | Papel |
| --- | --- |
| `useAuth` | Sessão, profile, role, view-as |
| `useAtividadesBoard` | Fetch + Realtime do board |
| `useCardMutations` | Mutations otimistas dos cards |
| `useEcossistemaSistemas` | Catálogo do HUB + fallback seed |
| `useNotificacoes` | Bell de notificações |
| `useSetores` | Setores da empresa |
| `useSupabaseData` / `useSupabaseQuery` | Loaders genéricos com Realtime opcional |
| `use-mobile` | Media query |
| `use-toast` | Toasts |

## Componentes proprietários
- **Layout/Guard**: `AppLayout`, `SiteHeader`, `NavLink`, `ProtectedRoute`, `RecoveryGuard`, `AuthErrorScreen`, `ErrorBoundary`, `OnboardingTour`, `ThemeToggle`.
- **UX kit**: `DataSourceBadge`, `EmptyState`, `ListState`, `FieldHelp`, `ScorePill`, `StatusBadge`, `StatusTimeline`.
- **Domínio**: `GanttChart`, `TasksChecklist`, `SolucaoTasksChecklist`, `AssistenteDescricao`, `DemandasSimilares`, `ResumoPipeline`, `NotificacoesBell`.
- **Atividades**: `CardDialog`, `Coluna`, `KanbanCard`, `DraftCard`, `BoardFilters`, `BoardCard`, `BoardSettingsDialog`, `NovoQuadroDialog`, `AnexosSection`, `ComentariosSection`, `AtividadeTimeline`, `CoverPopover`, `DatePrazoPopover`, `LabelsPopover`.
- **Importador**: `WizardStepper` + 7 steps (Origem, Upload, BoardOrigem, Selecao, Destino, DryRun, Execucao).
- **Diagrama**: `FlowEdge`, `StickyNoteNode`, `MapaNarrativa`.
- **Perfil**: `AvatarEditorDialog`.

## Componentes shadcn
48 componentes em `src/components/ui/` — todos consumindo tokens semânticos.

## Padrões
- **Fetching**: TanStack Query com queryKey estruturado; Realtime invalida via `queryClient.invalidateQueries`.
- **Formulários**: `react-hook-form` + `zod`.
- **DnD**: `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Gráficos**: `recharts` (react wrapper) + `chart.tsx` (config shadcn).
- **Markdown**: `react-markdown` + `remark-gfm` + `rehype-sanitize`.
- **PDF/Export**: `jspdf`, `html-to-image`.

## Convenções
- Cores só via tokens (`bg-background`, `text-foreground`, `bg-primary`, ...); **nunca** hex ou cores utilitárias fixas (`bg-white`, `text-black`).
- Tipografia da marca via `.font-brand` (NewBlackTypeface).
- Textos em pt-BR.
- Componentes ≤ 300 linhas quando possível; extrair subcomponentes.
