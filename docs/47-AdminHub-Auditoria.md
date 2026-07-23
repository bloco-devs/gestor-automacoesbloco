# 47 — AdminHub 2.0 · Auditoria de Superfície Administrativa

Fonte oficial da FEATURE 019. Mapeia toda a superfície admin existente antes de qualquer código de consolidação. Nenhuma rota abaixo é removida ou renomeada.

## Método

Varredura de `src/App.tsx` (rotas), `src/pages/admin/*`, `src/pages/*`, módulos em `src/modules/*` e páginas técnicas usadas pela equipe. Cada linha indica **rota → responsável (componente) → módulo → dependências → consumidores**.

## Mapa de rotas administrativas

### PLATAFORMA / Insights

| Rota | Página | Módulo | Depende de | Utilizado por |
|------|--------|--------|-----------|---------------|
| `/admin` | `admin/AdminHub.tsx` | — (hub legado) | `useFeatureFlags`, DS 2.0 | Entrada única atual |
| `/admin/saude` | `admin/Saude.tsx` | `modules/operations` | health checks locais | Operação |
| `/admin/analytics` | `admin/Analytics.tsx` | `modules/analytics` | 9 fontes React Query | Operação/Product |
| `/admin/dashboard` | `admin/Dashboard.tsx` | `modules/dashboard` | agregações do Board | Gestores |
| `/observabilidade-ia` | `ObservabilidadeIA.tsx` | `modules/ai` | tabela `ia_uso_log` | Devs/AI Ops |

### IA & Conhecimento

| Rota | Página | Módulo |
|------|--------|--------|
| `/admin/base-conhecimento` | `admin/BaseConhecimento.tsx` | `modules/knowledge-admin` |
| `/consolidacao` | `Consolidacao.tsx` | consolidação de duplicatas |
| _(prompts IA)_ | inline em `modules/ai` | sem tela dedicada; referenciado a partir do hub |

### Operacional (Workflow · SLA · Webhooks · Integrações · Portal)

| Rota | Página | Módulo |
|------|--------|--------|
| `/admin/workflows` | `admin/Workflows.tsx` | `modules/workflow-builder` |
| `/admin/workflows/novo` | `admin/WorkflowEditor.tsx` | idem |
| `/admin/workflows/:id` | `admin/WorkflowEditor.tsx` | idem |
| `/admin/workflows/execucoes` | `admin/WorkflowExecutions.tsx` | `modules/workflow-runtime` |
| `/admin/configuracoes/sla` | `admin/SLAPolicies.tsx` | `sla_policies` |
| `/admin/configuracoes/webhooks` | `admin/Webhooks.tsx` | webhook engine |
| `/admin/demandas` | `admin/Demandas.tsx` | `modules/demands` |
| `/portal` · `/portal/central` | `Portal.tsx` · `portal/PortalIndex.tsx` | `modules/knowledge` |
| `/ecossistema` | `Ecossistema.tsx` | `modules/ecossistema` |

### Segurança / Configuração

| Rota | Página | Notas |
|------|--------|-------|
| `/configuracoes` | `Configuracoes.tsx` | Plataformas, setores, personas |
| `/configuracoes#perfis` | idem | ancoragem — gestão de papéis (Perfis & Papéis) |
| _(sessões)_ | derivado de `useAuth` | não há tela dedicada; ponto único de logout no header |

### Desenvolvimento / Diagnóstico

| Rota | Página | Notas |
|------|--------|-------|
| `/diagrama` | `Diagrama.tsx` | Mapa vivo do ecossistema |
| `/ecossistema` | `Ecossistema.tsx` | Catálogo HUB + local |
| `/operacoes` | `Operacoes.tsx` | Centro de Operações |
| `/command-center` | `CommandCenter.tsx` | Sala de comando |
| `/workspace` | `DeveloperWorkspace.tsx` | 3 colunas dev |
| `/trabalho/inbox` | `Inbox.tsx` | Central de trabalho |

## Duplicidades detectadas

1. **Entradas para Analytics/Saúde** aparecem em `AdminHub`, `CommandCenter` e `Operacoes`. Todas apontam para a mesma rota — sem duplicação de dado, apenas de porta de entrada. AdminHub 2.0 fica como *primary entry*; demais permanecem como atalhos contextuais.
2. **Perfis & Papéis** hoje é apenas âncora dentro de `/configuracoes`. Continuará como âncora; o shell exibe entrada dedicada.
3. **Ecossistema** aparece em Configuração (AdminHub) e Desenvolvimento (diagrama). Ambos ficam mantidos — contexto diferente.
4. **Workflows** possuem três telas relacionadas (`/admin/workflows`, `/admin/workflows/novo`, `/admin/workflows/execucoes`). O shell agrupa como um único item de menu com filhos.

## Configurações órfãs

- **Feature flags** vivem apenas no bottom do `AdminHub` legado. AdminHub 2.0 as expõe como painel dedicado dentro do agrupamento *Plataforma → Feature Flags* (mesmo hook, mesma UI).
- **Prompts IA**: não há tela dedicada; entrada aparecerá com estado "em breve" apontando para `docs/`. Não cria código novo.
- **Variáveis** (env/publish settings): sem tela; entrada permanece "em breve".
- **Debug**: agrupa links já existentes (`/diagrama`, `/observabilidade-ia`).

## Configurações repetidas

Nenhuma configuração é duplicada em armazenamento. As repetições são apenas de *entry point* (AdminHub cards vs Sidebar principal), o que é intencional.

## Rotas a preservar

Todas as rotas listadas acima permanecem. AdminHub legado continua acessível em **`/admin/legado`** após a consolidação. O caminho `/admin` passa a renderizar o novo `AdminShellPage`, sem alterar comportamento de rotas filhas.

## Conclusões para a implementação

- Reagrupar em 5 categorias: **PLATAFORMA · IA · OPERACIONAL · SEGURANÇA · DESENVOLVIMENTO**.
- Reutilizar 100% das páginas atuais como conteúdo.
- Nenhuma criação de tabela, migration, RPC ou edge function.
- Feature flags e prompts IA continuam onde estão (hook `useFeatureFlags` / `ia_uso_log`).
- Busca global consome apenas o *registry* estático do shell + módulos platform já existentes.
