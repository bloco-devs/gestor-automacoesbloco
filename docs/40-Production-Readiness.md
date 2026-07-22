# 40 — Production Readiness

Documento oficial da FEATURE 014 — Platform Hardening & Production Readiness.
Consolida o que foi endurecido para a v1.0 e o que fica no roadmap pós-v1.

## 1. Checklist v1.0

- [x] Typecheck limpo (`tsgo`)
- [x] Testes verdes (`vitest`)
- [x] Zero regressão funcional observada
- [x] Bundle inicial reduzido (code splitting por rota)
- [x] QueryClient padronizado (staleTime/gcTime/retry)
- [x] Suspense boundary global com fallback acessível
- [x] Error Boundary raiz em `src/components/ErrorBoundary.tsx`
- [x] Loading/Empty/Error states padronizados (`EmptyState`, `ListState`, `LoadingInbox`)
- [x] Sanitização de Markdown via `rehype-sanitize` no admin de conhecimento
- [x] Documentação `/docs` atualizada

## 2. Performance

### Code splitting

Todas as rotas fora do fluxo de autenticação/entrada agora usam `React.lazy` +
`Suspense`. Chunks nomeados agrupam áreas afins:

| Chunk         | Rotas                                                    |
| ------------- | -------------------------------------------------------- |
| `ai`          | AIWorkspace, ObservabilidadeIA                           |
| `workspace`   | DeveloperWorkspace, Inbox                                |
| `operations`  | Operacoes, CommandCenter                                 |
| `atividades`  | Atividades, AtividadesBoard, ImportarQuadro              |
| `workflows`   | Workflows, WorkflowEditor, WorkflowExecutions            |
| `admin`       | Demandas, Dashboard, SLAPolicies, Webhooks               |
| `knowledge`   | BaseConhecimentoAdmin                                    |

Rotas críticas (`/auth`, `/sso/callback`, `/redefinir-senha`, `/escolher-perfil`,
`/`, `NotFound`) permanecem no bundle inicial para evitar flash de loader logo
após o boot.

### Cache padrão do React Query

Definido em `src/App.tsx`:

- `staleTime: 30_000` (30 s) — reduz refetch em navegação.
- `gcTime: 5 min` — mantém dados em cache para retorno rápido.
- `retry`: até 2 tentativas, mas **nunca** em erros de permissão/HTTP definitivo
  (`401/403/404/rls/denied`).
- `refetchOnWindowFocus: false` — evita re-fetches agressivos.
- `refetchOnReconnect: true` — recupera após queda de rede.
- Mutations: `retry: 0` (nunca reexecuta efeitos colaterais silenciosamente).

Hooks específicos podem sobrescrever quando fizer sentido (ex.: `useTeamPool`
usa `staleTime` de 5 min).

### Renderização

- Componentes de listas grandes (`Inbox`, `LoadingInbox`) usam `memo`.
- `useSyncExternalStore` no `useGlobalFavorites` evita re-renders desnecessários.
- `Registry` do Platform é singleton para evitar recriação por render.

## 3. Acessibilidade (WCAG AA)

- Loader global com `role="status"` + `aria-live="polite"` + `aria-hidden` no
  ícone.
- shadcn/Radix cobrem ARIA em Dialog, Popover, Command, DropdownMenu.
- Uso obrigatório de tokens (`text-foreground`, `text-muted-foreground`,
  `bg-background`) — sem cores arbitrárias que quebrem contraste no dark theme.
- Botões apenas com ícone recebem `aria-label`.
- Um único `<main>` por rota via `AppLayout`.
- Skip-link e navegação por teclado suportadas pelo `CommandPalette` (`mod+k`).

## 4. Segurança Frontend

- Markdown do admin de conhecimento sanitizado com `rehype-sanitize`.
- Sem `dangerouslySetInnerHTML` fora de contextos sanitizados.
- Storage: chaves namespaced (`platform:*`, `portal:*`, `app:*`) e sempre com
  `try/catch` em leitura/escrita.
- Nenhum token/segredo em `localStorage` fora do fluxo padrão do Supabase.
- Auth: `withTimeout` de 8 s no `getSession()` inicial evita boot travado.

## 5. Responsividade

- Layouts usam Tailwind com breakpoints padrão (`sm/md/lg/xl`).
- Sidebar tem modo colapsado e modo mobile (`useIsMobile`).
- Modo Foco (`mod+.`) esconde a sidebar para telas pequenas em uso intenso.
- Áreas com scroll usam `overflow-auto` explícito para evitar overflow global.

## 6. Observabilidade

- `ErrorBoundary` raiz captura exceções e oferece recarregar.
- Erros de IA são logados em `ia_uso_log` (backend, fora deste escopo).
- Front usa `console.error` com prefixo `[modulo]` — não há telemetria externa
  (decisão consciente: sem novo backend nesta feature).

## 7. Riscos conhecidos

- **HUB Bloco ID indisponível**: mapa cai para seed; UI mostra banner.
- **Supabase 503 no boot**: mitigado por timeout de 8 s no `getSession()`.
- **Chunks lazy + rede lenta**: fallback do Suspense é minimalista; usuário vê
  apenas um loader por navegação.
- **RLS**: auditado em `docs/RLS_AUDIT.md`; qualquer nova tabela precisa
  seguir o padrão `GRANT + ENABLE RLS + POLICY`.

## 8. Roadmap pós-v1

- Virtualização (`@tanstack/react-virtual`) em listas > 200 itens
  (Solicitacoes, AtividadesBoard, ObservabilidadeIA).
- Telemetria externa opcional (Sentry ou similar) atrás de flag.
- Preload inteligente de rotas ao passar o mouse na sidebar.
- Testes E2E com Playwright cobrindo fluxos: login → nova solicitação →
  triagem → workflow.
- Auditoria axe-core automatizada em CI.
- Análise de bundle com `rollup-plugin-visualizer` em build de release.
