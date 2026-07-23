# 84 — UX Rewrite Foundation (FEATURE 026.1)

**Status:** implementado (Fase 1 + Fase 4). Aditivo. Protegido pela feature flag `ux.rewrite` (default **OFF**).

## Arquitetura

Novo modelo mental — apenas **dois objetos centrais**:

1. **Demanda** — todo trabalho.
2. **Conhecimento** — resultado de uma demanda concluída.

Todo o restante da plataforma (Workflow, IA, Analytics, Observability, Security, Plugin Runtime, Service Mesh, SDKs) existe para apoiar esses dois objetos. Nenhum motor foi alterado nesta fase — apenas a camada de navegação.

## Perfis e Mapa

Quatro shells, cada um com sua própria navegação, todos consumindo a mesma infraestrutura:

```
PORTAL              WORKSPACE           GESTÃO              ADMIN
------              ---------           ------              -----
Início              Hoje                Panorama            Plataforma
Minhas Demandas     Demandas            Equipe              Pessoas
Conhecimento        Builder             Demandas            Integrações
Inbox               DevTools            Insights            Conhecimento
                    Inbox               Inbox               Segurança
                                                            Auditoria
```

Nenhum item aparece duas vezes. Máximo 2 níveis (grupo → item → subitem).

## Módulo

`src/modules/navigation/`

| Arquivo | Papel |
|---|---|
| `types.ts` | `NavigationProfile`, `NavigationGroup`, `NavigationItem`, `NavigationAlias`, `NavigationSchema`. |
| `registry.ts` | `UnifiedNavigationRegistry` — schemas por perfil. Única fonte de verdade. |
| `resolver.ts` | `resolveRoute`, `resolveProfile`, `findItem` — resolve alias → canônico. |
| `glossary.ts` | `ProductGlossary` + `LEGACY_TERMS` — nomenclatura oficial. |
| `UnifiedSidebar.tsx` | Sidebar única para todos os shells; recolhível; persistência em `localStorage`. |

API pública:

```ts
import { getNavigation, UnifiedSidebar, resolveRoute, ProductGlossary } from "@/modules/navigation";

<UnifiedSidebar profile="workspace" />
getNavigation("gestao"); // schema completo
resolveRoute("/atividades"); // → "/workspace/demandas"
```

## Glossário oficial

Termos legados → termo canônico:

| Legado | Oficial |
|---|---|
| Solicitação / Chamado / Ticket / Atividade / Card / Task | **Demanda** |
| Dashboard | **Início** |
| Centro Operacional / Command Center | **Panorama** |
| Operações | **Equipe** |

Todo texto novo deve consultar `ProductGlossary` ou `normalizeTerm()`.

## Aliases (compatibilidade)

Redirects (React Router `<Navigate replace>`) adicionados em `App.tsx`. Nenhuma rota antiga foi removida — todas continuam funcionando; as novas apenas apontam para as páginas existentes. Migração progressiva.

| De | Para |
|---|---|
| `/portal/inicio` | `/portal` |
| `/portal/demandas` | `/minhas-solicitacoes` |
| `/portal/conhecimento` | `/portal/central` |
| `/workspace/hoje` | `/trabalho/inbox` |
| `/workspace/demandas` | `/solicitacoes/kanban` |
| `/workspace/builder` | `/admin/workflows` |
| `/workspace/devtools` | `/developer` |
| `/gestao/panorama` | `/command-center` |
| `/gestao/equipe` | `/operacoes` |
| `/gestao/demandas` | `/admin/demandas` |
| `/gestao/insights` | `/admin/analytics` |
| `/admin/plataforma` | `/admin` |
| `/admin/integracoes` | `/admin/integrations` |
| `/admin/conhecimento` | `/admin/base-conhecimento` |
| `/admin/seguranca` | `/admin/security` |
| `/admin/auditoria` | `/admin/audit` |

## Feature Flag

`ux.rewrite` em `useFeatureFlags` (default **false**). Enquanto **OFF** a experiência atual permanece intacta (sidebar legada, rotas legadas). Enquanto **ON**, os shells poderão montar a `UnifiedSidebar` — a substituição do shell em cada AppLayout será feita nas próximas fases (026.2+).

## Fluxo de decisão

```
usuário → rota
  ├─ flag off → sidebar/legado inalterados
  └─ flag on  → resolveRoute(path) → perfil → UnifiedSidebar(profile)
```

## Persistência

`localStorage`:

- `ds2:unified-sidebar:collapsed` — estado recolhido global.
- `ds2:unified-sidebar:<profile>:group:<id>` — grupo expandido/recolhido.
- `ds2:unified-sidebar:<profile>:last` — última rota visitada por perfil.

## Plano de migração

1. **026.1 (esta fase)** — fundação: registry, sidebar, aliases, glossário, flag, doc.
2. **026.2** — trocar `AppLayout` para consumir `UnifiedSidebar` quando `ux.rewrite` estiver ON, resolvendo o perfil ativo pelo `resolveProfile(pathname)`.
3. **026.3** — normalizar textos legados usando `ProductGlossary` (Demanda unificada).
4. **026.4** — remover sidebars antigas quando `ux.rewrite` for GA.

## Restrições respeitadas

Nenhuma alteração em: banco, edge functions, IA, Workflow Engine, Plugin Runtime, Service Mesh, SDKs, Context Engine, Smart Routing, Analytics, Observability, Security, Design System, ou qualquer módulo funcional. Zero contrato público quebrado.
