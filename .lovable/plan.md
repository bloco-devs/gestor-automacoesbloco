# FEATURE 009 — Design System 2.0 + UX Consolidation

Consolidação puramente visual/estrutural. **Nenhuma** alteração em regra de negócio, edge functions, hooks de dados, schemas, RLS, engines (AI/Intent/Context/Workflow/Routing) ou rotas existentes.

## 🔒 Regras invioláveis (aprovadas pelo owner)

### 1. Execução incremental (OBRIGATÓRIO)
- Feature executada em ondas **independentes**.
- Cada onda: concluída → validada (`tsgo` + `vitest run` verdes) → preserva 100% do comportamento → só então a próxima começa.
- **Proibido** modificar arquivos que não pertençam à onda atual.
- Se uma alteração puder impactar outra funcionalidade, adiar para onda posterior.
- Ao fim de cada onda o sistema permanece totalmente funcional.

### 2. Preservação de telas administrativas
Telas técnicas (Diagramas, Observabilidade IA, SLA, Workflows, Logs, Auditoria, Integrações, Webhooks, Configurações) **não sofrem simplificação funcional**. Só recebem: melhoria visual, alinhamento, tipografia, espaçamento, responsividade, organização.
- **Proibido**: esconder configurações, remover opções, alterar fluxos ou comportamentos.

### 3. Não alterar identidade visual
Preservar paleta institucional Bloco (preto/areia/marrom/amarelo), logotipo, cores da marca, tema claro/escuro, componentes exclusivos. Evoluir o DS, não criar produto visual novo.

### 4. Guarda-corpos técnicos
- **Não editar**: `src/modules/ai/*`, `src/modules/context/*`, `src/modules/workflow-*`, `src/modules/routing/*`, `src/modules/knowledge*/services`, `src/hooks/useAuth`, `src/hooks/useAIWorkspace`, edge functions, migrations.
- **Pode editar** (só na onda correspondente): `src/components/ui/*`, `src/components/AppLayout.tsx`, `src/index.css`, `tailwind.config.ts`, wrappers de página, arquivos novos em `src/design-system/`.
- Storage keys novos usam prefixo `ds2:` (não colidir com tour/onboarding).
- IDs de `driver.js` (`data-tour="..."`) permanecem.

## Onda 0 — Auditoria (só relatório, zero código)
Varrer código e produzir `docs/34-Design-System-2.md` (seção "Auditoria"):
- Cards/headers duplicados (Dashboard vs Operações vs Inbox).
- Botões com alturas divergentes, tamanhos ad-hoc (`text-[13px]`).
- Espaçamentos fora da escala 4/8/12/16/24/32/48/64.
- KPIs redundantes entre dashboards.
- Sidebar plana com 15+ itens.

## Onda 1 — Tokens & fundações
Criar `src/design-system/`:
```
tokens/     spacing.ts, typography.ts, radius.ts, elevation.ts, motion.ts
layout/     PageShell.tsx, PageHeader.tsx, Section.tsx, Toolbar.tsx
patterns/   StatCard.tsx, KpiRow.tsx, EmptyPanel.tsx
index.ts, docs/README.md
```
- Utilities em `index.css`: `.ds-display / .ds-h1 / .ds-h2 / .ds-card-title / .ds-body / .ds-caption / .ds-label / .ds-helper` (fonte `NewBlackTypeface`).
- Tokens `--elev-1/2/3`, `--ease-standard`, durations 120/200/320ms.
- `tailwind.config.ts`: `fontSize` semântico, `boxShadow` (`elev-1..3`), `transitionTimingFunction`.
- Nenhuma cor nova. Nenhum componente existente tocado.

## Onda 2 — Primitivos shadcn afinados
Somente em `src/components/ui/`, sem quebrar API:
- `button.tsx`: alturas normalizadas (32/40/44), foco `ring-2 ring-ring/60`, variante `fab` aditiva.
- `card.tsx`: `rounded-2xl`, padding uniforme, `shadow-elev-1` default.
- `input/select/textarea/label`: altura 40, helper padronizado.
- `badge.tsx`: variantes success/warning/info/danger explícitas.

## Onda 3 — Sidebar reorganizada + AppLayout
Editar só `src/components/AppLayout.tsx`:
- Grupos `TRABALHO / ATENDIMENTO / ADMINISTRAÇÃO` via `SidebarGroup` colapsável.
- **Todas** rotas atuais preservadas.
- Grupo da rota ativa auto-expandido; estado persistido em `ds2:sidebar:<group>`.
- Header com `SidebarTrigger` sempre visível.
- `NotificacoesBell`, `ThemeToggle`, avatar, atalhos preservados.

## Onda 4 — PageShell aplicado por página (visual only)
Envolver páginas em `<PageShell><PageHeader/><Section/></PageShell>`:
Dashboard, Operações, Inbox, Portal, Board Demandas, Base de Conhecimento, Workflows, SLA, Webhooks, Diagrama, Observabilidade IA, Configurações, MeuPerfil, Atividades.
- Nenhuma alteração de props/dados; só molde externo e classes tipográficas.
- **Telas administrativas**: nenhuma configuração escondida ou removida.

## Onda 5 — Consolidação visual dos dashboards
- Unificar `MetricCard`/`HealthCard`/KPIs em `patterns/StatCard` + `KpiRow`.
- Hierarquia: atenção → indicadores → detalhes.
- Board Demandas: cards mais compactos, badges destacados, drag preservado.
- Centro Operações: 3 blocos verticais respiráveis.
- Base Conhecimento: leitura estilo Notion (max-w-3xl).
- AI Workspace: mais respiro, timeline discreta, preview em `elev-2`.

## Onda 6 — Microanimações, a11y, performance
- `transition-[background,box-shadow,transform] duration-200 ease-standard` em Card/Button hover.
- Foco visível universal.
- `React.memo` em `KanbanCard`, `MetricCard`, `StatCard`. `useMemo` em listas.
- Auditoria a11y: alt/aria-label faltantes.

## Onda 7 — Documentação + verificação final
- `docs/34-Design-System-2.md` completo.
- Link em `docs/15-Design-System.md`.
- `tsgo` + `vitest run` + Playwright em rotas principais.

## Fora de escopo
- Nada de tabela, migration, edge function, RPC nova.
- Nenhuma remoção de página, rota, permissão, item de menu.
- Sem trocar biblioteca de gráficos, DnD, roteamento.

## Critérios de aceite
- `tsgo` limpo, `vitest run` verde por onda.
- Todas rotas respondem e renderizam.
- Sidebar agrupada e colapsável com estado persistido.
- Cards/botões/inputs uniformes.
- Tipografia via `.ds-*` ou tokens shadcn — sem `text-[13px]` sobrando.
- `docs/34-Design-System-2.md` publicado.
- Identidade Bloco preservada; nenhuma configuração administrativa escondida.
