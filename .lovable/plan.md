# Onda Q3.6 — Hardening

Consolidação técnica antes de abrir a Q4. Escopo aditivo, sem novas funcionalidades grandes. Divide-se em 6 blocos independentes que podem ser entregues em sequência.

---

## 1. Favoritas de etiquetas por usuário (prioridade alta)

**Modelo novo:**
```text
atividades_label_favoritos (
  label_id  uuid  → atividades_labels(id) on delete cascade
  user_id   uuid  → auth.users(id)        on delete cascade
  created_at timestamptz default now()
  PRIMARY KEY (label_id, user_id)
)
```

**Backend:**
- Migração aditiva cria a tabela, GRANTs (`authenticated` full, `service_role` all), RLS `user_id = auth.uid()` para SELECT/INSERT/DELETE.
- RPC `atividades_label_toggle_favorita(_label_id uuid) returns boolean` substitui `atividades_label_set_favorita`.
- Backfill: para cada `atividades_labels.favorita = true`, inserir favorito para o `criado_por` do board (best-effort). Após backfill, `atividades_labels.favorita` fica marcado como legado (não removido nesta onda para não quebrar caches).

**Frontend:**
- `listLabels(boardId)` passa a fazer join com favoritos do usuário atual e retorna `favorita: boolean` derivado.
- `BoardSettingsDialog` (aba Etiquetas) e picker de etiquetas do card usam a nova RPC.
- Realtime: canal por-usuário em `atividades_label_favoritos`.

---

## 2. WIP com modo configurável

**Modelo:**
- `atividades_boards.wip_mode` enum `('info','warn','block')` default `'info'`.

**Backend:**
- Adiciona coluna + enum via migração.
- Extende `atividades_board_update` com `_wip_mode`.
- Novo trigger `enforce_wip_on_cards` em `atividades_cards` (BEFORE INSERT/UPDATE):
  - Lê `wip_mode` do board da coluna destino.
  - `info`: no-op.
  - `warn`: no-op no banco (aviso é do cliente).
  - `block`: se `count(cards da coluna destino excluindo o próprio) >= wip_limit`, `RAISE EXCEPTION` com `errcode='23514'` e mensagem estruturada.

**Frontend:**
- Aba Geral do `BoardSettingsDialog`: seletor "Aplicar limite de WIP" (Apenas informar / Avisar / Bloquear).
- `Coluna.tsx`: badge muda de tom conforme modo; em `warn`/`block` mostra toast ao mover para coluna cheia. Em `block`, mutation captura o erro do trigger e reverte o cache otimista.

---

## 3. Upload de capa — limpeza e resize

**Frontend (`atividadesBoards.ts`):**
- `validateCapa`: adicionar limite de resolução (máx 4000×4000).
- Antes do upload, redimensionar via canvas se `width > 1920` ou `height > 1080`, exportar `image/webp` q=0.85. Mantém original se já for menor.
- `updateBoard` com nova capa passa a chamar `removeCoverImage(oldPath)` sempre.

**Backend:**
- Edge function agendável `atividades-capas-gc` (invocação manual nesta onda, cron opcional depois):
  - Lista objetos do bucket `atividades-capas`.
  - Compara com `atividades_boards.cover_url`.
  - Remove órfãos com `created_at < now() - interval '24 hours'`.
  - Retorna relatório `{scanned, removed}`.

---

## 4. Virtualização do Kanban

Objetivo: suportar boards com 500–2000 cards sem degradação.

**Implementação:**
- Adicionar `@tanstack/react-virtual` (já compatível com o stack).
- `Coluna.tsx`: quando `cards.length > 40`, renderizar via `useVirtualizer` com `estimateSize=120`, `overscan=6`. Abaixo de 40, manter render direto (preserva DnD suave).
- DnD (`@dnd-kit`): configurar `SortableContext` com `strategy=verticalListSortingStrategy` e recomputar `getScrollElement` para o container virtualizado.
- Fallback: prop `virtualize?: boolean` no `Coluna` para poder desligar em debug.

**Aceite:** medir tempo de mount do board `default` (42 cards) — não deve regredir. Teste manual com board sintético de 1000 cards deve manter 60fps no scroll.

---

## 5. Auditoria (histórico) expandida

Complementar `atividades_board_historico` com eventos hoje ausentes.

**Novos eventos:**
- `card_movido` (dispara em `log_atividade_card_change` — já existe como `movido` de card; migrar para o board_historico com `card_id` no payload).
- `card_checklist_editado` (INSERT/UPDATE/DELETE em `atividades_cards.checklist` jsonb).
- `card_prazo_alterado` (já existe como `prazo` em card log; espelhar em board_historico).
- `coluna_wip_alterado` (já existe em RPC — validar).
- `board_visibilidade_alterada` (já emitido por `atividades_board_update`; validar payload).

**Implementação:** um trigger `sync_card_events_to_board_historico` AFTER INSERT em `atividades_atividade_log` copia eventos relevantes para `atividades_board_historico` com `evento` prefixado (`card_movido`, `card_prazo`, `card_checklist`).

**Frontend:** aba Histórico já suporta categorias — apenas adicionar filtro "Cards" e mapear os novos prefixos.

---

## 6. Pente-fino de UX

Sem mudanças de dados. Checklist a validar página por página:

- **Alinhamentos:** cabeçalho `AtividadesBoard`, grid do `Atividades.tsx`, dialog de settings em telas ≥1440px.
- **Responsividade:** Kanban horizontal com scroll snap em mobile; settings dialog vira sheet em <768px.
- **Dark mode:** revisar `KanbanCard`, badges de WIP, banner de capa (overlay legível), signed URL de cover em ambos os temas.
- **Animações:** transições de DnD (fade + translate), skeletons com shimmer consistente.
- **Loading/Skeletons:** `BoardCard` skeleton, `Coluna` skeleton, `CardDialog` skeleton nas abas pesadas (Anexos, Timeline).
- **Atalhos globais:** `?` abre cheatsheet; `N` novo card na primeira coluna; `/` foca busca do board; `Esc` fecha dialogs. Registrados via `useHotkeys` hook novo, desabilitados quando input em foco.

---

## Ordem sugerida de execução

1. Bloco 1 (favoritas por usuário) — 1 migração + 1 RPC + 2 componentes.
2. Bloco 5 (auditoria) — 1 migração + 1 trigger.
3. Bloco 2 (WIP configurável) — 1 migração + 1 trigger + settings UI.
4. Bloco 3 (capa: resize + GC) — 1 edge function + resize client.
5. Bloco 4 (virtualização) — 1 dependência + refactor de `Coluna`.
6. Bloco 6 (UX pente-fino) — sem migração, revisão visual.

Cada bloco é entregável de forma independente; se algum for cortado, os demais seguem.

## Não incluído nesta onda

- Campos personalizados, subtarefas, dependências, dashboard, automações, templates — reservados para Q4.
- Importador RFC-001 permanece congelado.
- Remoção da coluna legada `atividades_labels.favorita` — só após uma release com o novo modelo estável.
