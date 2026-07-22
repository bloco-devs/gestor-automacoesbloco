# FEATURE 018A — Auditoria Arquitetural do Ecossistema

> **Status:** Somente leitura. Nenhum arquivo de código, migração, tabela, edge function, RPC, componente ou página foi criado ou modificado durante esta auditoria.

**Data:** 2026-07-22 · **Rota atual do usuário:** `/auth` · **Escopo:** todos os artefatos com termos `ecossistema/ecosystem/sistema/systems/plataforma/platform/solução/solution/integração/integration/mapa/graph/dependency/relacionamento`.

---

## 1. Sumário executivo

O "Ecossistema" já é um **módulo real, funcional e em produção**, composto por três frentes que evoluíram em ondas separadas do plano original:

| Frente | Superfície | Origem dos dados | Estado |
|---|---|---|---|
| **A. Catálogo de sistemas** | `/ecossistema` (Backstage-like) | HUB Bloco ID (edge `ecossistema-mapa`) → fallback local `SISTEMAS_SEED` | 🟢 Produção |
| **B. Mapa/Diagrama** | `/diagrama` (React Flow) | Provider dual: **camada Soluções** (banco local) + **camada Ecossistema** (HUB, com narrativa por IA) | 🟢 Produção |
| **C. Match de reaproveitamento** | `NovaSolicitacao`, `Consolidacao`, `AI Workspace` | `match-ecossistema` (IA + catálogo HUB) → grava `solicitacoes.match_sugestoes` | 🟢 Produção |

Também há reflexos em Portal, Copilot, Admin Hub, Analytics, Search Registry e Context Engine.

**Recomendação final:** **não** abrir uma "Feature 018 — Ecossistema" que crie tabelas/rotas novas. O módulo já cobre catálogo + mapa + match + confirmação. As lacunas restantes são **evoluções cirúrgicas**, listadas em §10 e §12.

---

## 2. Frontend existente

### 2.1 Páginas

| Arquivo | Rota | Papel |
|---|---|---|
| `src/pages/Ecossistema.tsx` (94 linhas) | `/ecossistema` | Catálogo Backstage: KPIs (sistemas/grupos/fonte/filtrados), busca, filtro por grupo, cards com link "Ver no diagrama". Consome `useEcossistemaSistemas`. |
| `src/pages/Diagrama.tsx` (1310 linhas) | `/diagrama` | React Flow com **camadas** `solucoes` / `ecossistema`, autoscroll para nó, sticky notes, colunas de conexão, exportação PNG/PDF, narrativa IA (`MapaNarrativa`), badge de fonte HUB × Semente. |
| `src/pages/NovaSolicitacao.tsx` | `/nova-solicitacao/classico` | Seletor "Sistema do ecossistema" + fire-and-forget para `match-ecossistema` que popula cache antes de o dev consolidar. |
| `src/pages/SolicitacaoDetail.tsx` | `/solicitacao/:id` | Mostra sistema-alvo, badge de fonte do catálogo e sugestões de match. |
| `src/pages/Consolidacao.tsx` | `/consolidacao` | Fila de consolidação do dev: chama `match-ecossistema` on-demand, `confirmar-atendimento-existente` e `reprocessar-matches` em lote. |
| `src/pages/portal/NewTicketDialog.tsx` | `/portal` | Popular seletor a partir da tabela **local** `plataformas`. |
| `src/pages/admin/AdminHub.tsx` | `/admin` | Card "Ecossistema — Catálogo de sistemas." apontando para `/ecossistema`. |

### 2.2 Hooks / providers / adapters

| Arquivo | Responsabilidade |
|---|---|
| `src/hooks/useEcossistemaSistemas.ts` (58) | Chama edge `ecossistema-mapa`; degrada para `SISTEMAS_SEED`; devolve `{sistemas, fonte:"hub"\|"semente", loading}`. Reutilizado por 5 telas. |
| `src/lib/mapaSource.ts` (106) | Fachada `MapaProvider` com duas camadas: `localSolucoesProvider` (lê `demanda_solucoes/posicoes/conexoes/notas/solicitacoes`) e `hubEcossistemaProvider` (stub — dados reais são carregados diretamente pelo `Diagrama.tsx` chamando `ecossistema-mapa`). |
| `src/lib/ecossistemaSeed.ts` (216) | 15 sistemas + 6 conectores externos + integrações; função `computeEcossistemaLayout()` faz autolayout por grupo (colunas) tanto para o seed quanto para dados HUB. |
| `src/lib/diagrama.ts` | CRUD do diagrama local: `listPosicoes / listConexoes / listNotas / listColunas / upsertPosicao / createConexao / …`. |
| `src/components/diagrama/MapaNarrativa.tsx` (150) | Painel lateral que chama edge `mapa-narrativa` para gerar texto explicativo do mapa (riscos + integrações faltantes). |

### 2.3 Integração com módulos "novos"

| Módulo | Como usa o Ecossistema | Arquivo |
|---|---|---|
| **AI Workspace** | `useAIWorkspace` consome `useEcossistemaSistemas` (lista sistemas na preview) e o orchestrator chama `match-ecossistema`. | `src/hooks/useAIWorkspace.ts:6,63` · `src/modules/ai/services/ai-workspace-service.ts:72` · `src/modules/ai/services/ai-orchestrator.ts:132` |
| **AI Preview** | Tipo `SistemaAlvoOption` reutilizado. | `src/components/ai-workspace/PreviewPanel.tsx:22` |
| **Copilot Dock** | Detecta rotas `/ecossistema` e `/diagrama` para adaptar contexto (Context Engine). | `src/modules/copilot/CopilotDock.tsx:28` |
| **Platform Registry (search)** | Entrada "Diagrama" com keywords `["diagrama","mapa","ecossistema"]` alimenta Command Palette e Spotlight. | `src/modules/platform/registry/defaults.ts:117-120` |
| **Analytics (F017)** | Lê `plataformas` para nomear sistemas no ranking; **não** consome o catálogo HUB. | `src/modules/analytics/hooks/useAnalyticsData.ts:46,124` |
| **Demands / CreateDemandDialog** | Lê `plataformas` local. | `src/modules/demands/components/CreateDemandDialog.tsx:54` |
| **Context Engine** | Rotas do ecossistema estão no `pathname`, mas não há módulo `"ecossistema"` explicitamente registrado no `ContextProvider`. | (implícito) |

### 2.4 Tipos

`src/lib/types.ts` define `Solucao`, `Solicitacao` (com `match_sugestoes`, `sistema_alvo_slug`, `atendida_por_sistema_slug`, `desfecho`, `consolidada_em`). Não há `types.ts` dedicado ao ecossistema — os tipos vivem em `mapaSource.ts` (`MapaSnapshot`, `EcossistemaHubData`) e `ecossistemaSeed.ts` (`SistemaSeed`, `IntegracaoSeed`, `EcossistemaNodeSeed`).

---

## 3. Backend / Edge Functions

Total: **5 edge functions** dedicadas ao Ecossistema. Todas em `supabase/functions/` com `verify_jwt` habilitado (exceto quando aceitam service role para cron).

| Função | Papel | Depende de | Escreve |
|---|---|---|---|
| `ecossistema-mapa/index.ts` (235) | Proxy read-only: chama `HUB/functions/v1/ecossistema-catalogo`, indexa sistemas/conectores por slug, deduplica arestas (endpoints + sincronizações), agrega saúde 30d. Devolve `{fonte:"hub"\|"erro", sistemas, conectoresExternos, integracoes, saude}`. Nunca lança — em falha devolve `{fonte:"erro"}` HTTP 200. | `BLOCO_ID_HUB_URL`, `BLOCO_ID_TOKEN` | **nada** |
| `match-ecossistema/index.ts` (278) | Pega demanda (título/descrição/tipo/sistema_alvo), busca catálogo do HUB, chama IA (`_shared/ia-gateway.ts`) com prompt de análise, devolve até 3 candidatos (`sistema_slug`, `modulo`, `confianca`, `justificativa`). Rate-limit + `ia_uso_log`. | HUB + IA Gateway | `ia_uso_log` |
| `reprocessar-matches/index.ts` (172) | Cron/manual: pega até 20 demandas abertas com match desatualizado (>7 dias), invoca `match-ecossistema` para cada uma, salva em `solicitacoes.match_sugestoes` + `match_atualizado_em`. Autoriza `service_role` OU dev/admin. | `match-ecossistema` | `solicitacoes.match_sugestoes` |
| `confirmar-atendimento-existente/index.ts` (228) | Marca demanda como já atendida por sistema existente: `desfecho='atendida_por_sistema'`, `atendida_por_sistema_slug`, `atendida_url`, `atendida_em`, `atendida_por`; cria `notificacoes`; best-effort e-mail via HUB `send-email` (Resend). | HUB + service role | `solicitacoes`, `notificacoes` |
| `mapa-narrativa/index.ts` (173) | Recebe payload sanitizado do Diagrama (soluções, conexões, colunas, saúde, observações) e devolve texto PT-BR (explicação, riscos, integrações faltantes) via IA. Rate-limit + `ia_uso_log`. | IA Gateway | `ia_uso_log` |

Funções relacionadas (não dedicadas ao ecossistema, mas usam-no):
- `triagem-demanda/index.ts` — usa `sistema_alvo_slug` para melhorar sugestão de score/tipo.

---

## 4. Banco de dados

### 4.1 Tabelas com papel direto no ecossistema

| Tabela | Papel | Consumidores | Realtime |
|---|---|---|---|
| `plataformas` | Catálogo local de sistemas (id, nome). Usado em seletores do Portal, Demands e Analytics. **Coexiste** com o catálogo vivo do HUB — fonte da verdade divergente. | `NewTicketDialog`, `CreateDemandDialog`, `AnalyticsPage`, `useAnalyticsData` | ❌ |
| `solucoes` | Soluções documentadas (visão dev). | `Solucoes.tsx`, `SolucoesKanban`, `SolucoesGantt`, `mapaSource.localSolucoesProvider` | ❌ |
| `demanda_solucoes` | Ligação demanda ↔ solução, base do mapa "Soluções". | `supabaseData.ts` (5 usos), `mapaSource`, `useSupabaseData`, `useSupabaseQuery` | ✅ (`REPLICA IDENTITY FULL`) |
| `solucao_diagrama_posicoes` | Coordenadas dos nós do diagrama. | `src/lib/diagrama.ts` | ❌ |
| `solucao_diagrama_conexoes` | Arestas persistidas do diagrama. | `src/lib/diagrama.ts` | ❌ |
| `solucao_diagrama_conexao_colunas` | Colunas/tipos por aresta (payload rico). | `src/lib/diagrama.ts` | ❌ |
| `solucao_diagrama_notas` | Sticky notes do diagrama. | `src/lib/diagrama.ts` | ❌ |
| `criterios_solucoes` | Critérios avaliativos por solução. | `Solucoes.tsx` | ❌ |
| `bloco_connect_recursos` | Recursos consumíveis (contexto de integrações). | `bloco-connect` (área admin) | ❌ |
| `solicitacoes` (campos) | `sistema_alvo_slug`, `match_sugestoes` (JSONB), `match_atualizado_em`, `desfecho`, `atendida_por_sistema_slug`, `atendida_url`, `atendida_em`, `atendida_por`, `consolidada_em` — todos vinculados ao fluxo de match/consolidação. | Todas as telas de demanda | ✅ |

**Não existem** tabelas `ecossistema_*`, `sistemas`, `integracoes`, `conectores`, `ecosystem_health` locais — o catálogo vivo mora **exclusivamente no HUB Bloco ID** (`ref cgbhpenkytibgiosksrb` conforme project_knowledge). Isto é intencional.

### 4.2 RLS / RPC / triggers relevantes

- `demanda_solucoes` — RLS por `is_allowed_user`, replicada em realtime desde `20260506190019`.
- `bloco_connect_recursos` — RLS "Admins can view".
- `solicitacao_status_change_check` / `set_solicitacao_desfecho` — triggers que consolidam efeitos do `desfecho` (parte do fluxo de `confirmar-atendimento-existente`).
- **Não há** RPC dedicada ao ecossistema; tudo passa por edge functions.

---

## 5. IA — participação atual do Ecossistema

| Módulo IA | Ecossistema participa? | Como |
|---|---|---|
| **AI Workspace** | ✅ Sim | Preview lista sistemas do catálogo (`useEcossistemaSistemas`) e chama `match-ecossistema` via orchestrator. |
| **AI Orchestrator / Intent Engine** | ✅ Sim | `ai-orchestrator.ts:132` expõe "best-effort de match no ecossistema — retorna candidatos ou []". |
| **Context Engine** | 🟡 Parcial | Copilot lê `pathname` para saber que está em `/ecossistema` ou `/diagrama`, mas **não** há módulo `"ecossistema"` no `ContextStore` com estado próprio (sistema selecionado, fonte, etc). |
| **Copilot Dock** | ✅ Sim | Ativa contexto ecossistema pelo pathname. |
| **Smart Routing** | ❌ Não | O motor de roteamento (`src/modules/routing/`) não considera afinidade dev × sistema-alvo. |
| **Workflow Engine** | ❌ Não | Nenhuma action do registry lê catálogo ou match. Não há trigger "quando `desfecho=atendida_por_sistema`". |
| **Knowledge** | ❌ Não | Artigos não estão indexados por sistema/módulo; a busca `knowledge_search` ignora `sistema_alvo_slug`. |
| **Analytics** | 🟡 Parcial | Lê `plataformas` **local** para nomear ranking, ignora o catálogo vivo do HUB e a taxa de match aceito. |

---

## 6. Rotas

| Rota | Proteção | Componente |
|---|---|---|
| `/ecossistema` | `ProtectedRoute` (qualquer allowed) | `EcossistemaPage` |
| `/diagrama` | `ProtectedRoute role="developer"` | `Diagrama` |
| `/solucoes`, `/solucoes/kanban`, `/solucoes/gantt`, `/solucoes/:id` | `role="developer"` | Suite de Soluções |
| `/consolidacao` | `role="developer"` | `Consolidacao` |
| `/nova-solicitacao/classico` | Auth | `NovaSolicitacao` |
| `/portal` (NewTicketDialog) | Auth | `NewTicketDialog` |
| `/admin` (card) | Admin | `AdminHub` |

Rotas **inexistentes** (e não recomendadas criar): `/ecossistema/mapa`, `/ecossistema/health`, `/ecossistema/sistemas/:slug`, `/ecossistema/integracoes` — o mapa já é `/diagrama` e o detalhe por sistema seria duplicado.

---

## 7. Fluxo arquitetural (estado atual)

```
Usuário
  ↓
Portal (NewTicketDialog) ── plataformas (local)
  ↓
Nova Solicitação ── useEcossistemaSistemas ──→ edge ecossistema-mapa ──→ HUB
  ↓                                                    │ fallback: SISTEMAS_SEED
  ↓  fire-and-forget: match-ecossistema (IA)
  ↓  grava solicitacoes.match_sugestoes
  ↓
AI Workspace ── orchestrator.matchEcosystem() ──→ match-ecossistema
  ↓
Intent Engine (classifica: REUSE_EXISTING vs NEW)
  ↓
Context Engine (pathname, mas sem estado dedicado)
  ↓
Dev abre Consolidação ── mostra match_sugestoes
  ↓  se confirma → confirmar-atendimento-existente
  ↓                 grava desfecho + notificacoes + email (HUB Resend)
  ↓  senão → segue pipeline normal
  ↓
Developer Workspace / Operations Center (usam sistema como filtro)
  ↓
Analytics ── plataformas (local) — não conta match aceito
  ↓
Diagrama (React Flow)
  ├─ camada Soluções: banco local (demanda_solucoes + diagrama_*)
  └─ camada Ecossistema: HUB via ecossistema-mapa (com saúde 30d) → seed
       ↓
     Mapa Narrativa (IA)
```

---

## 8. Reutilizações possíveis (o que já existe pronto)

| Precisa de… | Já existe | Onde |
|---|---|---|
| Listar sistemas em selector | ✅ | `useEcossistemaSistemas` |
| Renderizar catálogo Backstage | ✅ | `EcossistemaPage` |
| Layout automático por grupo | ✅ | `computeEcossistemaLayout` |
| Cor por taxa de falha | ✅ | `Diagrama.tsx` (verde<10 / âmbar / vermelho / cinza) |
| Narrativa por IA | ✅ | `MapaNarrativa` + `mapa-narrativa` |
| Sugerir sistema existente | ✅ | `match-ecossistema` |
| Reprocessar em lote | ✅ | `reprocessar-matches` |
| Confirmar reaproveitamento | ✅ | `confirmar-atendimento-existente` |
| Fallback offline | ✅ | `SISTEMAS_SEED` |
| Fonte HUB × Semente | ✅ | badge em Ecossistema, Diagrama, SolicitacaoDetail, NovaSolicitacao |
| Persistência de posição/notas/colunas | ✅ | `solucao_diagrama_*` |

**Nada aqui deve ser recriado.**

---

## 9. Duplicidades encontradas

| # | Duplicidade | Locais | Recomendação |
|---|---|---|---|
| D1 | **Catálogo local `plataformas` vs. catálogo vivo do HUB** | `Portal/NewTicketDialog`, `CreateDemandDialog`, `Analytics` usam `plataformas` (tabela local, estática). Ecossistema/Diagrama/NovaSolicitação/AI Workspace usam `useEcossistemaSistemas` (HUB). | Unificar consumidores: substituir chamadas a `plataformas` por `useEcossistemaSistemas` (com fallback ao seed). Manter `plataformas` só se houver FK que dependa dela. |
| D2 | **Duas fontes de "sistemas" no Diagrama** | Camada Soluções (banco local) e Camada Ecossistema (HUB) coexistem por design — **não é duplicidade** funcional, é dupla visão. | Manter. |
| D3 | **`SISTEMAS_SEED` vs. catálogo HUB** | O seed tem 15 sistemas hard-coded; o HUB é a fonte da verdade. | Aceitável enquanto for **apenas** fallback. Se o HUB estabilizar, marcar o seed como "somente offline dev". |
| D4 | **Provider stub `hubEcossistemaProvider`** | `mapaSource.ts` declara o provider mas o Diagrama **não** o consome — chama `ecossistema-mapa` direto. | Ou remover o stub, ou centralizar a chamada dentro do provider (baixa prioridade). |
| D5 | **Consolidação com botão "reprocessar" + cron possível via service role** | `Consolidacao.tsx:420` invoca `reprocessar-matches` manualmente; a edge também aceita service role para cron. | Se ainda não há cron configurado no Supabase, agendar (fora do escopo desta auditoria). |
| D6 | **Formatação de "fonte" (HUB/Semente/Local)** repetida em 4 telas | `EcossistemaPage`, `Diagrama`, `SolicitacaoDetail`, `NovaSolicitacao` cada uma renderiza sua badge. | Extrair `<FontBadge fonte={...}/>` compartilhado (baixa prioridade). |

**Não há** duplicidade estrutural entre Ecossistema e Analytics/Operations/Knowledge/Routing/Workflow/Demandas/Portal — cada um consome o Ecossistema como dado, sem replicar sua lógica.

---

## 10. Lacunas reais

### 🟢 Baixa prioridade
- L1 — Componente compartilhado `<DataSourceBadge>` (HUB/Semente/Local) para acabar com repetição.
- L2 — Página de detalhe por sistema (`/ecossistema/:slug`) com resumo, módulos, endpoints e demandas ligadas.
- L3 — Remover ou concretizar o stub `hubEcossistemaProvider` em `mapaSource.ts`.
- L4 — Migrar `Portal` e `CreateDemandDialog` para `useEcossistemaSistemas` (unifica seleção).

### 🟡 Média prioridade
- L5 — Registrar módulo `"ecossistema"` no **Context Engine** (`useEcossistemaContext`) com `sistemaSelecionado`, `fonte`, `matchsAbertos`. Copilot passa a receber isso automaticamente.
- L6 — Métricas de **match no Analytics**: taxa de aceite (`desfecho='atendida_por_sistema'` / total match), sistemas mais reaproveitados, tempo médio até consolidação.
- L7 — **Roteamento por afinidade**: Smart Routing usar histórico de `sistema_alvo_slug` × dev responsável para ponderar candidatos.
- L8 — **Knowledge por sistema**: indexar `sistema_alvo_slug`/`atendida_por_sistema_slug` em `knowledge_articles.metadata` e expor filtro na Central de Soluções.

### 🔴 Alta prioridade
- L9 — **Cron agendado** para `reprocessar-matches` (hoje só há botão manual e edge aceita service role). Automatiza a limpeza da fila.
- L10 — **Fluxo do Portal**: hoje `NewTicketDialog` cria demanda sem passar por `match-ecossistema`. O reaproveitamento só é sugerido após o dev abrir a demanda. Chamar `match-ecossistema` no Portal (fire-and-forget) e **mostrar candidatos ao solicitante** antes de gravar reduz criação de duplicatas — reusa 100% da infra.
- L11 — **Realtime em `plataformas`** (se decidido mantê-la) ou **cache invalidation** de `useEcossistemaSistemas` — atualmente o hook só carrega uma vez por sessão; se o HUB atualiza catálogo, cliente não vê até refresh.

---

## 11. Diagrama Mermaid

<lov-artifact url="/__l5e/documents/Ecossistema_Diagram.mmd" mime_type="text/vnd.mermaid"></lov-artifact>

---

## 12. Recomendação final

### ❌ **NÃO criar** uma "Feature 018 — Ecossistema" nova
O módulo já cumpre: catálogo, mapa, saúde, narrativa IA, match, confirmação, reprocessamento, fallback offline, integração AI/Copilot/Registry. Criar tabelas `sistemas`/`integracoes` locais seria duplicar o HUB e quebrar a arquitetura "HUB é fonte da verdade" definida em ADR-001.

### ✅ **Evoluir** com uma feature cirúrgica: **F018 — Ecossistema Ativo**
Escopo enxuto (todas aditivas, sem tabelas novas):

1. **Portal com match preditivo** (L10) — invocar `match-ecossistema` no `NewTicketDialog` e oferecer "isto já existe em X" antes do submit.
2. **Cron de `reprocessar-matches`** (L9) — agendamento via `pg_cron`/scheduler do Supabase, usando a mesma edge já existente.
3. **Módulo `ecossistema` no Context Engine** (L5) — expor `sistemaSelecionado` + `fonte` ao Copilot.
4. **Analytics de reaproveitamento** (L6) — 3 novas seções em `useAnalyticsData` reutilizando `demands` (`desfecho`, `atendida_*`), sem tabela nova.
5. **`<DataSourceBadge>` compartilhado** (L1) — refactor cosmético.

Ficam **fora**: novas tabelas, novas edge functions, novas rotas dedicadas, mudança do fluxo `HUB → catálogo`.

---

## 13. Riscos arquiteturais

| Risco | Severidade | Descrição |
|---|---|---|
| R1 | 🔴 Alta | `plataformas` (local) diverge do catálogo HUB. Portal cria demandas com IDs que não existem no HUB. |
| R2 | 🟡 Média | `useEcossistemaSistemas` cacheia apenas em memória do componente — atualizações no HUB não refletem sem reload. |
| R3 | 🟡 Média | `match-ecossistema` roda por demanda sem debounce agregador; picos de criação = picos no HUB e no IA Gateway. Rate-limit existe mas não há coalescing. |
| R4 | 🟢 Baixa | Fallback silencioso para semente pode mascarar HUB fora do ar por horas sem alerta. Considerar toast/telemetria quando `fonte==="semente"` de forma persistente. |
| R5 | 🟢 Baixa | `SISTEMAS_SEED` desatualiza se novos sistemas nascem no HUB e nunca são refletidos no seed. |
| R6 | 🟡 Média | `hubEcossistemaProvider` é um stub — mudanças futuras no `mapaSource.ts` podem enganar quem lê o código. |

---

## 14. Próximos passos recomendados

1. **Validar em produção** o funcionamento de `ecossistema-mapa` e `match-ecossistema` com o HUB atual (checar `ia_uso_log` + `solicitacoes.match_atualizado_em`).
2. Decidir se **desativar `plataformas`** ou marcá-la como legado (L4).
3. Aprovar escopo da **F018 — Ecossistema Ativo** conforme §12.
4. Após F018: F019 (Admin Hub) apenas reorganiza — sem mudança de banco. F020 (AI Copilot) por último, aproveitando o módulo `ecossistema` do Context Engine.

---

**Fim do relatório — nenhum artefato produtivo foi alterado.**
