# Roadmap

## Índice
- [Fase atual](#fase-atual)
- [Próxima fase](#próxima-fase)
- [Longo prazo](#longo-prazo)

## Fase atual — Estabilização (Q3 2026)
- **Task 006 — Intelligent Inbox** entregue: nova rota `/trabalho/inbox`, priority engine local, insights heurísticos e integração com Context Engine (Dashboard preservado). Detalhes em `docs/24-Intelligent-Inbox.md`.
- **Task 007 — Platform Productivity Layer** entregue: `src/modules/platform` com Navigation/Search/Command registries, Command Palette global (⌘K), hotkeys, ranking heurístico. Detalhes em `docs/25-Platform-Productivity.md`.
- Módulo Atividades RC1 em produção.
- 11 ondas de IA em produção (`Onda 0` guardrails → `Onda 10` testes).
- Importador Trello (RFC-001) em produção.
- Realtime endurecido (`REPLICA IDENTITY FULL`).
- Sistema de avatares e capas globais.

## Próxima fase — Hardening & Multi-tenant Atividades
1. **Sprint A — Hardening**
   - `strictNullChecks` no TS.
   - Code-splitting por rota (`React.lazy`).
   - `ErrorBoundary` por rota.
   - Fechar warnings críticos do Supabase Linter (search_path).
2. **Sprint B — RLS por board**
   - Escopar `atividades_*` por `atividades_board_membros`.
   - Testes de regressão por papel.
3. **Sprint C — Observabilidade IA**
   - Métrica de fallback HUB.
   - Painel de custo (tokens × dia × função).
4. **Sprint D — Refino Atividades**
   - Extração de subcomponentes em páginas > 400 linhas.
   - Débitos G10 (reorder intra-coluna), G11 (SolucoesKanban A/B), G14 (paginação/virtualização).
5. **Sprint E — Novos adapters**
   - Jira, Asana sobre o framework RFC-001.
6. **Sprint F — Performance**
   - Análise de bundle.
   - Migração de `useSupabaseQuery` para `useQuery`.

## Longo prazo
- Multi-workspace real (hoje só `grupo-bloco`).
- Automação de sugestão de solução via IA generativa com aprovação humana.
- Portal público read-only para diretoria.
- Integração bidirecional com Sienge (fora do escopo hoje).
- SDK interno para plugar novos módulos.
