
# Diagnóstico + Evolução do Kanban de Atividades ao padrão Trello

## 1. Como o sistema funciona hoje (diagnóstico)

**Arquitetura geral**
- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui. Roteamento em `src/App.tsx` com `AuthProvider` (SSO Bloco ID) + `ProtectedRoute` por papel (`requester`/`developer`/`admin`).
- **Backend:** Supabase EXTERNO (`cgbhpenkytibgiosksrb`). Toda mutação passa por RLS. Autenticação é SSO federado via HUB Bloco ID (`sso-login`, `sso-introspect`). **Não mexer.**
- **IA:** Edge functions via `_shared/ia-gateway.ts` → HUB. Score é server-authoritative (trigger `compute_scores`).
- **Realtime:** `useSupabaseData` já assina `postgres_changes` para tabelas do domínio de solicitações (não inclui `atividades_*` ainda).

**Módulo Atividades (foco da evolução)**
- `src/pages/Atividades.tsx` (836 linhas): quadro com colunas horizontais, DnD entre/dentro de colunas (`@dnd-kit`), rascunhos locais, filtros (Responsável, Solução).
- `src/components/atividades/CardDialog.tsx` (764 linhas): modal com título, descrição (texto simples), responsáveis (users + personas), solução vinculada, checklist, links, comentários (aba embutida).
- `src/lib/atividades.ts`: CRUD de `atividades_colunas`, `atividades_cards`, `atividades_comentarios`, `atividades_personas`.
- Tabelas existentes:
  - `atividades_colunas` (5 col, 1 policy) — colunas fixas.
  - `atividades_cards` (15 col, 4 policies) — inclui `checklist jsonb`, `links jsonb`, `responsavel_ids uuid[]`, `responsavel_persona_ids uuid[]`, `solucao_id`, `ordem`.
  - `atividades_comentarios` (6 col, 4 policies).
  - `atividades_personas` (6 col, 4 policies).
- RLS: todas escopadas por `is_allowed_user()`/ownership (auditadas em `docs/RLS_AUDIT.md`).

**O que JÁ funciona no padrão Trello**
DnD fluido, cartões com título/descrição/checklist/links/comentários/responsáveis múltiplos, filtros por responsável e solução, rascunhos locais.

**Gaps vs. Trello**
1. Sem **etiquetas coloridas** (labels).
2. Sem **prioridade** explícita.
3. Sem **data de entrega/prazo** nem badge de status (atrasado/hoje/no prazo/concluído).
4. Sem **anexos** (arquivos).
5. Sem **histórico de movimentações** (activity log).
6. Sem **busca rápida** por texto no topo do quadro.
7. Sem **filtros por etiqueta/prazo**.
8. Sem **cover** colorida no cartão.
9. Sem **barra de progresso** do checklist no cartão do quadro.
10. Descrição é `Textarea` simples — não há **Markdown**.
11. Sem **realtime** em `atividades_*` (multi-usuário vê stale até refresh).
12. Sem **automações** por movimentação (ex.: mover para "Concluído" marca conclusão, dispara notificação).
13. Colunas hoje não são **personalizáveis** pelo usuário (nome/ordem/nova/remover) — só existem as fixas do seed.

## 2. Mapa de dependências e riscos

| Área tocada | Depende de | Risco de regressão |
|---|---|---|
| `atividades_cards` (novas colunas) | `Atividades.tsx`, `CardDialog.tsx`, `lib/atividades.ts`, tipos do Supabase (autogerados) | **Baixo** se aditivo (novas colunas nullable + defaults). Types regeneram após migration aprovada. |
| Nova tabela `atividades_labels` + `atividades_card_labels` | RLS padrão do módulo | **Baixo** — segue padrão existente. |
| Nova tabela `atividades_atividade_log` | Triggers em `atividades_cards`/`atividades_comentarios` | **Médio** — trigger mal escrito pode bloquear updates. Mitigação: `SECURITY DEFINER`, `EXCEPTION WHEN OTHERS`. |
| Realtime em `atividades_*` | `ALTER PUBLICATION supabase_realtime ADD TABLE` | **Baixo** — RLS continua filtrando. |
| Colunas personalizáveis | `atividades_colunas` (add `board_id` futuro?) | **Médio** — mudança de modelo. Nesta fase mantemos board único global (como hoje) e só permitimos CRUD de colunas. |
| Anexos | Novo bucket Storage `atividades-anexos` + policies + coluna `anexos jsonb` no card | **Médio** — quotas/segurança do storage. Restrito a `is_allowed_user()`. |
| Automações por movimentação | Trigger `AFTER UPDATE` em `atividades_cards` + tabela `atividades_regras` (opcional) | **Alto** se regras arbitrárias. Nesta fase apenas 2 automações fixas: mover para coluna "Concluído" → `concluido=true` + notificação para responsáveis. |
| SSO / RLS / edge functions IA / Score / Diagrama | — | **Zero mudança.** Escopo isolado a `atividades_*`. |

## 3. Plano faseado (7 ondas incrementais, cada uma segura sozinha)

Cada onda: migração aditiva + código + `vitest run` + verificação manual. **Nada de refactor amplo.** Reutiliza `Atividades.tsx`, `CardDialog.tsx`, `lib/atividades.ts`.

### Onda T1 — Base de dados (aditiva)
- Migration única, idempotente:
  - `alter table atividades_cards add column if not exists data_entrega timestamptz, data_inicio timestamptz, concluido boolean default false, cover_cor text, prioridade text check (prioridade in ('baixa','media','alta','urgente')) null, descricao_markdown boolean default true`.
  - `create table atividades_labels (id, nome, cor, ordem)` + GRANT + RLS + policies (leitura `is_allowed_user()`, escrita `is_allowed_user()`).
  - `create table atividades_card_labels (card_id, label_id, pk composta)` + GRANT + RLS.
  - `create table atividades_atividade_log (card_id, user_id, user_email, tipo, payload jsonb, created_at)` + GRANT + RLS (leitura `is_allowed_user()`, insert via trigger `SECURITY DEFINER`).
  - `create table atividades_anexos (id, card_id, nome, url, mime, tamanho, uploaded_by, created_at)` + GRANT + RLS.
  - Trigger `log_atividade_card_change` (`AFTER INSERT/UPDATE/DELETE on atividades_cards`) — grava movido/renomeado/prazo/conclusão em `atividades_atividade_log`.
  - Trigger `log_atividade_comentario` — grava comentário.
  - `ALTER PUBLICATION supabase_realtime ADD TABLE atividades_cards, atividades_comentarios, atividades_labels, atividades_card_labels, atividades_atividade_log`.
- Bucket Storage `atividades-anexos` (privado) + 4 policies (`is_allowed_user()`).

**Riscos:** mínimo. Nenhuma coluna dropada/renomeada. Types do Supabase regeneram automaticamente.

### Onda T2 — Etiquetas, prazo, prioridade, cover no cartão
- `lib/atividades.ts`: novos tipos + CRUD `listLabels`, `upsertLabel`, `deleteLabel`, `setCardLabels`.
- `CardDialog.tsx`: seções novas (etiquetas com popover + criação inline; date picker prazo; select prioridade; seletor de cover).
- `Atividades.tsx` (cartão no quadro): pills de etiquetas, badge de prazo colorido, ícone de prioridade, cover no topo, barra de progresso do checklist.
- Tokens de cor de label em `index.css` (HSL semânticos — sem hardcode).

**Arquivos:** `src/lib/atividades.ts`, `src/components/atividades/CardDialog.tsx`, `src/pages/Atividades.tsx`, `src/index.css`, `tailwind.config.ts`. Sem mexer no restante do app.

### Onda T3 — Descrição em Markdown
- Adicionar `react-markdown` + `remark-gfm` (leves, ~30KB gzip).
- Toggle "Editar / Visualizar" no `CardDialog`.
- Sanitização com `rehype-sanitize` (default seguro).

### Onda T4 — Anexos
- Componente `CardAnexos` no `CardDialog`: upload → bucket `atividades-anexos` → grava em `atividades_anexos`.
- Lista com preview de imagem, download e delete (com confirmação).
- Ícone + contador no cartão do quadro.

### Onda T5 — Busca, filtros, ordenação, aba Atividade
- Barra superior fixa em `Atividades.tsx`: campo de busca (debounce 150ms, filtra título/descrição/labels), filtro por Etiqueta e por Prazo (`Sem prazo`, `Vence esta semana`, `Atrasadas`, `Concluídas`).
- Contador "X de Y cartões".
- Nova aba **Atividade** no `CardDialog` unindo `atividades_atividade_log` + comentários em timeline cronológica.

### Onda T6 — Realtime + Automações fixas
- Hook `useAtividadesRealtime` em `Atividades.tsx`: `useEffect` que assina `postgres_changes` em `atividades_cards`, `atividades_card_labels`, `atividades_atividade_log` — cleanup obrigatório com `supabase.removeChannel`.
- Automação 1: mover para coluna com `chave='concluido'` → seta `concluido=true` + `data_conclusao=now()` (trigger no banco).
- Automação 2: mudança de responsável em card com prazo → cria notificação em `notificacoes` (trigger, best-effort).

### Onda T7 — Polimento visual Trello
- `rounded-xl`, `shadow-sm` no cartão, `shadow-md` no drag overlay, transição `scale/rotate` leve.
- Largura fixa de coluna 272px (padrão Trello) com scroll horizontal.
- Hover states sutis, foco visível, `focus-visible:ring`.
- Colunas ganham botão "…" (renomear/excluir/adicionar coluna). CRUD de `atividades_colunas` já existe.
- Testes de acessibilidade básica (roles ARIA no DnD).

## 4. Como evito regressões

1. **Migrações 100% aditivas** — `if not exists`, defaults nullable, sem drop/rename. Reversíveis com um `alter drop column`.
2. **Types do Supabase** regeneram após aprovação da migration — só edito código que depende de novas colunas **depois** disso.
3. **RLS espelha o padrão existente** (`is_allowed_user()`) já auditado em `docs/RLS_AUDIT.md` — sem novas superfícies públicas.
4. **Escopo cirúrgico** — só toco `atividades_*`. Zero mudança em SSO, edge functions IA, score, diagrama, solicitações, soluções.
5. **`vitest run` verde** ao fim de cada onda (34 testes atuais + novos para prazo/labels).
6. **Verificação manual mínima** por onda: criar/mover/editar cartão continua funcionando; filtros existentes continuam; comentários existentes intactos.
7. **Realtime só na onda T6** — evita interações imprevistas nas ondas anteriores.
8. **Sem novas dependências pesadas** — apenas `react-markdown` + `remark-gfm` + `rehype-sanitize` na T3.

## 5. Perguntas antes de implementar (regras de negócio)

Vou esperar a aprovação e responder estas antes de começar a T1:

1. **Board único ou múltiplos boards?** Hoje é board global único (todas as colunas para todos os `is_allowed_user()`). Manter assim ou preparar multi-board?
2. **Quem pode criar/editar etiquetas?** Qualquer `is_allowed_user()` ou só `admin`/`developer`?
3. **Anexos: tamanho máximo por arquivo?** Sugiro 10MB. E tipos permitidos (qualquer, ou lista branca)?
4. **Automação "concluído":** mover para a coluna final marca automaticamente `concluido=true`? Ou o usuário deve marcar explicitamente?
5. **Comentários: manter modelo atual** (apenas texto)? Ou permitir @menção de responsáveis (dispararia notificação)?
6. **Colunas personalizáveis:** liberar renomear/excluir/adicionar coluna nesta fase, ou manter as fixas atuais e só permitir reordenar?

## 6. Ordem de execução proposta

T1 (migração) → aguarda aprovação → T2 → T3 → T4 → T5 → T6 → T7. Publish só ao fim, quando você decidir.

Aprova o plano? Se sim, respondo as 6 perguntas com defaults sugeridos e começo pela T1.
