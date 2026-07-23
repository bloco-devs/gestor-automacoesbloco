# FEATURE 026.2 — Portal Unificado

> Continuação direta da FEATURE 026.1 (Fundação da Nova UX). Toda a experiência
> descrita aqui só é renderizada quando a feature flag **`ux.rewrite`** está
> ligada. Com a flag OFF, o produto continua exatamente igual à versão anterior.

## Objetivo

Transformar o Portal na **única porta de entrada do solicitante**. Ao final da
feature o solicitante não precisa mais navegar por Nova Solicitação, Minhas
Solicitações, Kanban, Gantt, Dashboard, Tickets ou Chamados — **tudo passa a
existir dentro de `/portal/*`**.

O produto reconhece apenas dois objetos:

- **Demanda** (objeto principal)
- **Conhecimento** (objeto secundário)

## Arquitetura

Módulo de **composição pura** — não cria motor, banco, edge function, IA ou SDK.
Tudo é reutilização direta da infraestrutura já existente.

```text
src/modules/portal-unified/
├── PortalShell.tsx         # Layout + abas (Início / Demandas / Conhecimento / Inbox)
├── PortalHeader.tsx        # Saudação
├── PortalQuickCreate.tsx   # Campo principal — reusa useAIWorkspace + KnowledgeSuggestions
├── PortalRecentDemands.tsx # 3 demandas recentes (humanizadas)
├── PortalKnowledgeSection.tsx
├── PortalInboxPreview.tsx
├── PortalDemandsList.tsx   # Lista + filtros Todas/Abertas/Andamento/Concluídas
├── statusHuman.ts          # Traduz DemandStatus técnico → linguagem humana
├── UxRewriteGate.tsx       # Gate único: renderiza `enabled` ou `disabled`
└── index.ts

src/pages/portal/
├── PortalUnifiedHome.tsx        # /portal e /portal/inicio (flag ON)
├── PortalDemandasPage.tsx       # /portal/demandas
├── PortalConhecimentoPage.tsx   # /portal/conhecimento
└── PortalInboxPage.tsx          # /portal/inbox
```

### Reutilização (zero backend novo)

| Necessidade                | Motor reutilizado                                  |
| -------------------------- | -------------------------------------------------- |
| Nova Demanda conversacional| `useAIWorkspace` + componentes de `ai-workspace/`  |
| Sugestões inline           | `@/modules/knowledge` (`KnowledgeSuggestions`)     |
| Confirmação pós-envio      | `RichConfirmation`, `ThinkingSteps`                |
| Lista de demandas          | `useDemands` (React Query + Realtime)              |
| Detalhe da demanda         | `/solicitacao/:id` (página existente)              |

## Fluxo do solicitante

1. Chega em `/portal` → vê **Início** com o campo *"Descreva sua necessidade…"*.
2. Digita. A IA propõe soluções da Base de Conhecimento em tempo real.
3. Clica em **Nova Demanda** → conversa é finalizada com `PreviewPanel` e
   confirmação rica.
4. Acompanha em **Minhas Demandas** (status humanizados).
5. Recebe avisos em **Inbox** (apenas notificações — nada de KPI, tarefa ou IA).

## Rotas e aliases

Todas as rotas canônicas ficam dentro de `AppLayout` e passam pelo
`UxRoute` gate:

| Rota                     | Flag ON                | Flag OFF (compat.)              |
| ------------------------ | ---------------------- | ------------------------------- |
| `/portal`                | `PortalUnifiedHome`    | `Portal` (legado)               |
| `/portal/inicio`         | `PortalUnifiedHome`    | Redireciona → `/portal`         |
| `/portal/demandas`       | `PortalDemandasPage`   | Redireciona → `/minhas-solicitacoes` |
| `/portal/conhecimento`   | `PortalConhecimentoPage` | Redireciona → `/portal/central` |
| `/portal/inbox`          | `PortalInboxPage`      | Redireciona → `/trabalho/inbox` |
| `/nova-solicitacao`      | Redireciona → `/portal/inicio` | `AIWorkspace` (legado)   |
| `/minhas-solicitacoes`   | Redireciona → `/portal/demandas` | `MinhasSolicitacoes`   |
| `/dashboard-solicitante` | Redireciona → `/portal/inicio` | `RequesterDashboard`     |

Links antigos continuam funcionando; nenhum bookmark quebra.

## Humanização de status

`humanizeStatus` (em `statusHuman.ts`) traduz `DemandStatus` técnicos para a
linguagem do solicitante. **Termos proibidos em qualquer texto do Portal**:
Sprint, Backlog, Kanban, Workflow, SLA, Pipeline.

| DemandStatus         | Rótulo humano             |
| -------------------- | ------------------------- |
| `backlog`, `a_fazer` | Em análise                |
| `em_desenvolvimento`, `em_testes` | Em desenvolvimento |
| `homologacao`        | Aguardando validação      |
| `concluido`          | Concluída                 |

## Inbox

No Portal Unificado o Inbox **deixa de ser centro de trabalho**. Mostra apenas
comunicação: notificações, comentários, menções, aprovações e eventos.
Nenhuma tarefa, KPI, prioridade, IA, backlog ou card.

## IA como camada ambiente

A IA nunca aparece como página no Portal. Ela existe apenas *inline* — como
sugestão, resumo, melhoria, pesquisa e conhecimento relacionado — através dos
mesmos motores (Knowledge Engine, AI Workspace).

## Plano de migração

1. **Fase A (agora)**: flag OFF por padrão. Rotas novas coexistem com legadas.
2. **Fase B**: ligar `ux.rewrite` para grupos-piloto de solicitantes.
3. **Fase C**: `ux.rewrite` como default. Rotas legadas continuam via alias.
4. **Fase D**: depreciação de páginas legadas do solicitante em release futura.

## Testes

- `statusHuman.test.ts` — garante que **nenhum rótulo humano contém jargão
  técnico** e valida filtros.
- `navigation.test.ts` — garante que o schema do perfil `portal` continua com
  exatamente 4 itens e que os aliases legados apontam para as rotas canônicas.

## Critérios de aceite

Todos atendidos:

- Flag `ux.rewrite` controla toda a experiência do Portal.
- Nova Demanda funciona via AI Workspace existente.
- Minhas Demandas reutiliza `useDemands`.
- Inbox mostra apenas comunicação.
- Conhecimento integrado inline.
- IA aparece como camada ambiente.
- Nenhum termo técnico exposto.
- Rotas antigas continuam funcionando.
- Zero backend novo, zero migrations, zero edge functions.
- Nenhum motor alterado.
