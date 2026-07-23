# FEATURE 026 — Product UX Rewrite (v2)

Reorganização integral da experiência sobre a arquitetura já existente. **Nenhuma funcionalidade é removida** — módulos são mantidos, movidos, fundidos, escondidos ou transformados em visualização. Zero mudança em backend, banco, edge functions, SDK, Plugin Runtime, Service Mesh, IA ou Workflow Engine.

---

## Princípio arquitetural (atualizado)

**Dois objetos centrais.** Toda a plataforma gira em torno deles; tudo o mais é apoio.

1. **Demanda** — o ciclo de trabalho.
2. **Conhecimento** — o resultado do trabalho.

Todo o restante existe para apoiar esses dois objetos:

- **IA (Copilot)** ajuda a criar e executar demandas. Camada, não módulo.
- **Workflow** automatiza demandas.
- **Analytics / Observabilidade / Qualidade** medem demandas.
- **Plugins / SDK / Marketplace / Studio** estendem demandas.
- **Segurança / Compliance** protegem demandas.
- **Integrações** conectam demandas ao ecossistema.

Uma demanda concluída pode virar **Conhecimento** (deflexão + reuso).

**Ciclo canônico único.**
```text
Nova → Triagem (IA) → Backlog → Sprint → Em Dev → Homologação → Concluída → (Conhecimento)
```

---

## Auditoria — estado atual

### Duplicidades de objeto
Cinco vocabulários para o mesmo objeto: **Solicitação · Ticket · Chamado · Atividade · Card** = **Demanda**.
Duas grafias para o mesmo resultado: **Solução · Artigo** = **Conhecimento**.

### Duplicidades de tela
- **4 Kanbans** (`/solicitacoes/kanban`, `/solucoes/kanban`, `/atividades`, `/admin/demandas`).
- **2 Gantts** (`/solicitacoes/gantt`, `/solucoes/gantt`).
- **5 Dashboards** (`/dashboard`, `/dashboard-solicitante`, `/admin/dashboard`, `/command-center`, `/operacoes`).
- **5 painéis de leitura** (`/admin/analytics`, `/admin/saude`, `/admin/observability`, `/observabilidade-ia`, `/admin/quality`).
- **4 pontos de entrada de trabalho** (`/workspace`, `/trabalho/inbox`, `/nova-solicitacao`, `/portal`).
- **Admin fragmentado** (`/admin`, `/admin/legado`, `/configuracoes`, `/admin/configuracoes/*`, `/admin/base-conhecimento`, `/admin/integrations/*`).
- **Devtools fragmentado** (`/developer/*` + `/studio` + `/admin/quality` + `/admin/observability`).

### Fluxos quebrados
- Solicitante tem 3 origens para criar (`/nova-solicitacao`, `/portal`, `/minhas-solicitacoes`).
- Ciclo de status diverge entre módulos.
- IA aparece como botão isolado, nunca como camada.
- Inbox mistura tarefas + KPIs + notificações — viola o próprio nome.

### Complexidade
Sidebar atual expõe **60+ destinos** em **3 shells** diferentes. Um novato precisa aprender três mapas.

---

## Correções sobre a v1 do plano (feedback aplicado)

1. **"Atividades" desaparece da navegação.** Vira apenas visualização de `Demandas`. Rotas antigas redirecionam.
2. **Um único Kanban.** Board de Demandas, Kanban de Solicitações e Atividades fundidos em `Demandas → Board`.
3. **Workspace = Home do Desenvolvedor.** Dev abre o sistema e cai em Hoje, sem intermediário.
4. **Inbox = comunicação, nunca dashboard.** Menções, comentários, aprovações, eventos. Só isso.
5. **"Dashboard" some do menu.** Cada perfil tem sua Home nomeada (Início · Hoje · Panorama · Plataforma).
6. **Centro Operacional é apenas visão do Gestor**, não módulo autônomo.
7. **Copilot some da navegação.** Continua presente em toda tela como camada.
8. **Builder unificado.** Workflow · Studio · Plugins · SDK · Marketplace · Templates em um só shell.
9. **Insights unificado.** Analytics · Operação · Performance · Qualidade · IA · Runtime · Plugins em abas.
10. **Produto pensado pelo usuário, não pelos módulos.** Menu reflete tarefas, não árvore de código.

---

## FASE 1 — Arquitetura de Produto

**Objetivo.** Consolidar "2 objetos · 1 ciclo · 4 perfis · IA como camada" e mapear todo módulo atual.

**Mapa de reorganização (nenhuma feature removida).**

| Módulo atual | Ação | Novo lugar |
|---|---|---|
| `/nova-solicitacao` (AI Workspace) | Manter, promover | Ação universal "Nova Demanda" (⌘N) |
| `/nova-solicitacao/classico` | Esconder | Fallback do AI Workspace |
| `/portal`, `/minhas-solicitacoes` | Fundir | **Início** do Solicitante |
| `/solicitacoes`, `/solicitacoes/kanban`, `/solicitacoes/gantt` | Fundir em visões | `Demandas` (Lista · Board · Sprint · Timeline · Gantt) |
| `/admin/demandas` | Fundir | mesma `Demandas`, filtro gestão |
| `/atividades`, `/atividades/:id` | **Remover da nav** | `Demandas → Board / Sprint` |
| `/solucoes`, `/solucoes/:id`, kanban, gantt | Fundir | Aba "Concluídas" em Demandas + artigo em Conhecimento |
| `/trabalho/inbox` | Redefinir | **Inbox** = notificações/menções/aprovações |
| `/dashboard`, `/dashboard-solicitante`, `/admin/dashboard` | Remover nome "Dashboard" | Substituído por Início / Hoje / Panorama |
| `/workspace` | Promover | **Hoje** — Home do Desenvolvedor |
| `/command-center`, `/operacoes` | Fundir | **Panorama** — Home do Gestor |
| `/developer/*` (12) | Agrupar | **Devtools** (só devs) |
| `/studio`, `/admin/workflows*`, `/admin/plugins*`, `/plugins/marketplace` | Fundir shell | **Builder** (Workflow · Studio · Plugins · SDK · Marketplace · Templates) |
| `/admin/analytics`, `/admin/saude`, `/observabilidade-ia`, `/admin/observability`, `/admin/quality` | Fundir | **Insights** (Operação · Performance · Qualidade · IA · Runtime · Plugins) |
| `/admin/base-conhecimento`, `/admin/knowledge*` | Manter | **Conhecimento** (2º objeto central) |
| `/admin/integrations/*` | Manter, mover | Sub-área de Admin |
| `/admin/security*`, `/admin/compliance*` | Manter | Sub-área de Admin |
| `/configuracoes`, `/admin/configuracoes/*`, `/admin`, `/admin/legado` | Fundir | **Admin** único com abas |
| Copilot plugin, `AssistenteDescricao`, `DemandasSimilares`, `MapaNarrativa` | Camada ambiente | Presente em toda tela, sem página própria |

**Componentes afetados.** `navigationRegistry`, `AppLayout`, `AdminShellLayout`, `DeveloperShell`, `IntegrationShell`, `SidebarGroupsNav`, `ProtectedRoute`, `Index.tsx`.
**Componentes reutilizados.** Todos os módulos em `src/modules/*` intactos como serviços.
**Impacto.** Reescrita da camada de navegação e das home pages por perfil. Rotas antigas viram aliases.
**Riscos.** Bookmarks antigos → redirects client-side permanentes.
**Aceite.** (1) Glossário único publicado; (2) todo módulo tem casa no novo mapa; (3) zero rota removida.

---

## FASE 2 — Mapa completo de navegação

Máx. **6 grupos**, **2 níveis**, zero repetição entre grupos.

```text
SOLICITANTE (shell "Portal")
├── Início              (nova demanda + minhas em andamento + sugestões IA)
├── Minhas Demandas     (lista + detalhe + histórico)
├── Conhecimento        (busca + artigos)
└── Inbox               (comunicação)

DESENVOLVEDOR (shell "Workspace")
├── Hoje                (minha sprint · demanda atual · PRs · bloqueios · Copilot)
├── Demandas            (Lista · Board · Sprint · Timeline · Gantt)
├── Conhecimento        (leitura + publicação a partir de demandas)
├── Builder             (Workflow · Studio · Plugins · SDK · Marketplace · Templates)
├── Devtools            (Runtime · Query · Perf · Deps · Docs · IA · Services)
└── Inbox

GESTOR (shell "Gestão")
├── Panorama            (fila · SLA · riscos · carga · distribuição)
├── Equipe              (pessoas · afinidade · disponibilidade)
├── Demandas            (mesma tela, filtros gestão)
├── Insights            (Operação · Performance · Qualidade · IA · Runtime · Plugins)
└── Inbox

ADMINISTRADOR (shell "Admin")
├── Plataforma          (config · flags · settings · release)
├── Pessoas & Papéis
├── Conhecimento (admin)
├── Integrações         (APIs · Webhooks · Connectors · Mesh · SDK)
├── Segurança & Compliance
└── Auditoria & Logs
```

**Regra.** `mod+k` resolve qualquer destino sem depender da sidebar. Copilot embutido em cada tela.
**Aceite.** Cada rota atual mapeia para exatamente um destino no novo mapa (redirect quando necessário).

---

## FASE 3 — Novo fluxo de demandas

**Ciclo único visível em todos os perfis, IA como camada ambiente.**

```text
Nova → Triagem (IA) → Backlog → Sprint → Em Dev → Homologação → Concluída → (Conhecimento)
```

**IA em cada passo (reusa edge functions atuais).**
- Nova: `assistente-demanda` sugere título/descrição/anexos.
- Triagem: `triagem-demanda` categoriza/prioriza/estima; `demandas-similares` deflete duplicatas.
- Backlog: Copilot sugere responsável (Smart Routing) e esforço.
- Sprint: `resumo-pipeline` mostra risco de estouro.
- Dev: Copilot gera checklist + resumo de progresso.
- Homologação: IA compara critérios de aceite × entrega.
- Concluída → Conhecimento: `demand-ai-plan` promove a artigo.

**Aceite.** Uma demanda percorre o ciclo sem trocar de tela; todo shell mostra o mesmo status/vocabulário.

---

## FASE 4 — Nova Sidebar

- Primitiva **única**, config por perfil. `SidebarGroupsNav` compartilhada entre Portal / Workspace / Gestão / Admin.
- Colapsada 56px, expandida 240px, persistência local.
- Ordem: trabalho → apoio → leitura → admin (só admin).
- Item = ícone + label + rota. Badge só para contagem real (Inbox, aprovações).
- Topo: `⌘K`. Rodapé: `Nova Demanda` (⌘N).
- **Sem grupo "Copilot"**, **sem grupo "Atividades"**, **sem "Dashboard"**.

**Aceite.** Todo shell renderiza a mesma primitiva; nenhuma sidebar exclusiva sobrevive.

---

## FASE 5 — Homes por perfil (substitui "Dashboard")

Não existe mais uma rota `/dashboard` visível.

- **Início (Solicitante).** Caixa "Descreva sua necessidade…" (AI inline) · 3 demandas em andamento · busca de Conhecimento · sugestões IA.
- **Hoje (Desenvolvedor).** 3 colunas: minha sprint · demanda atual (detalhe + timeline) · Copilot + PRs + bloqueios.
- **Panorama (Gestor).** Uma tela: fila em risco · SLA da semana · distribuição por pessoa/sistema · top-3 críticas.
- **Plataforma (Admin).** Estado da plataforma: flags · releases · segurança · integrações · auditoria recente.

**Regra visual.** Sem grade de KPI cards. Tipografia como hierarquia (1 número âncora + 2–3 apoios inline + 1 gráfico).
**Aceite.** Cada home responde a UMA pergunta clara.

---

## FASE 6 — Novo Inbox

**Inbox = comunicação.** Notificações, menções, comentários, aprovações pendentes, eventos de workflow, alertas de SLA.
**Fora do Inbox.** Tarefas, KPIs, "próxima demanda", prioridade calculada — isso vive em **Hoje**.

Motor `src/modules/inbox/*` mantido. UI: lista cronológica agrupada por dia · filtros (Menções · Aprovações · Sistema) · ação inline (responder, aprovar, abrir demanda).

**Aceite.** Inbox nunca mostra "trabalho a fazer".

---

## FASE 7 — Experiência do Solicitante

Home única (`/portal` → `/inicio`). Menu: **Início · Minhas Demandas · Conhecimento · Inbox**. Fim.
**Proibido.** Kanban, Gantt, Board, jargão ("SLA", "sprint", "backlog", "triagem" — traduzir para linguagem humana via `LanguageProvider`).
**Aceite.** Novo colaborador abre e acompanha uma demanda em < 60s sem treinamento.

---

## FASE 8 — Experiência do Desenvolvedor

- **Hoje** é a home. Login → Hoje.
- **Demandas** é uma tela com 5 visões (Lista · Board · Sprint · Timeline · Gantt) sobre a **mesma** query.
- **Builder** hospeda Workflow · Studio · Plugins · SDK · Marketplace · Templates em abas.
- **Devtools** oculto para não-devs; reúne `/developer/*`.
- **Copilot** aparece como painel lateral persistente (colapsável), não como página.

**Aceite.** Dev nunca precisa entrar em `/portal` ou `/solicitacoes` para trabalhar.

---

## FASE 9 — Experiência do Gestor

- **Panorama** é a home. Uma tela, sem cards genéricos.
- **Equipe.** Pessoas · carga · afinidade de sistema (Smart Routing analytics) · disponibilidade.
- **Demandas.** Mesma tela do dev, filtros gestão (sem responsável, atrasadas, alto risco).
- **Insights.** Abas: Operação · Performance · Qualidade · IA · Runtime · Plugins.

**Aceite.** Gestor responde qualquer pergunta operacional em uma tela.

---

## FASE 10 — Experiência do Administrador

Shell **Admin** único substitui `/admin`, `/admin/legado`, `/configuracoes`, `/admin/configuracoes/*`.
Grupos: **Plataforma · Pessoas & Papéis · Conhecimento (admin) · Integrações · Segurança & Compliance · Auditoria & Logs**.
Admin nunca vê trabalho do dia-a-dia por padrão; alterna com `viewAs`.

**Aceite.** Toda tela de configuração hoje espalhada tem exatamente 1 lugar novo.

---

## FASE 11 — Refatoração visual

**Princípios.** Menos bordas · menos cards · menos sombras · tipografia como hierarquia · densidade Linear/Notion (linha 32px, padding 12px, radius 8px) · cor só para estado · motion 120–180ms ease-out · Lucide stroke 1.5, ícone 16.
**Tokens.** Reusa `src/design-system/tokens/*`. Ajuste spacing/typography, **não** troca de paleta.
**Componentes afetados.** `Card`, `PageShell`, `PageHeader`, `Section`, `KpiRow`, `StatCard`, `Toolbar` — ganham variante `flat` default.
**Aceite.** Screenshot lado a lado mostra clara redução de ruído sem perder informação.

---

## FASE 12 — Migração sem quebrar features

**Estratégia.** Aditivo → coexistente → default → alias. Feature flag `ux.rewrite` (infra existente em `useFeatureFlags`).

| Semana | Entrega |
|---|---|
| 1 | Fundação: `navigationRegistry` por perfil, primitiva única de sidebar, redirects atrás da flag |
| 2 | Solicitante (Início) + Inbox reduzido |
| 3 | Desenvolvedor (Hoje + Demandas unificada + Builder) |
| 4 | Gestor (Panorama + Equipe + Insights) |
| 5 | Admin único |
| 6 | Refatoração visual (variante flat + densidade) |
| 7 | Cleanup: flag default `true`; rotas antigas permanecem como aliases |

**Riscos & mitigação.**
- Bookmarks antigos → redirects client-side permanentes.
- Testes E2E → atualizar seletores em lote antes de virar default.
- Plugins de terceiros → guia de migração; APIs SDK inalteradas.

**Aceite final.**
1. Nenhuma feature perdida (checklist 1-a-1 com Fase 1).
2. ≤ 6 grupos, ≤ 2 níveis em todos os perfis.
3. Novato descreve o ciclo da demanda em < 5 min lendo o glossário.
4. Zero mudança em backend, banco, edge functions, SDK, Plugin Runtime, Service Mesh, IA, Workflow Engine.
5. `ux.rewrite=false` renderiza a experiência atual sem regressão.

---

## Próximo passo

Aprovar para iniciar **Fase 1 + Fase 4** (fundação de navegação + sidebar unificada por perfil), que destravam todas as demais fases sem tocar em nenhuma feature.
