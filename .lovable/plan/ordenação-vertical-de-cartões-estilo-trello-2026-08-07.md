# Ordenação vertical de cartões (estilo Trello)

Arrastar para cima/baixo, com os vizinhos abrindo espaço, e a nova posição gravada para todos. Vale para as colunas do quadro Kanban e para as duas Caixas de Entrada.

## O que muda para quem usa

- Ao arrastar um cartão dentro da mesma coluna, os cartões vizinhos deslizam e abrem o espaço onde ele vai cair (hoje o arrasto só reconhece a coluna de destino, e soltar no meio da coluna não muda nada).
- Soltar grava a nova sequência imediatamente; se a gravação falhar, a lista volta ao que era e aparece um aviso.
- Na Caixa de Entrada, a ordem arrastada passa a valer para toda a equipe e sobrepõe a ordenação automática (score/chegada). Cartões nunca reposicionados continuam depois dos posicionados, na ordem automática de sempre.

## Situação atual (verificada)

- Quadro: os cartões usam `useDraggable` (`KanbanCard.tsx`) e não há `SortableContext` no `BoardLente`. O `onDragEnd` (`aoTerminar`) sai cedo quando origem e destino são a mesma coluna — é o motivo de reordenar não funcionar.
- A persistência de posição no quadro já existe e está pronta: `reorderCardsBulk` → RPC `atividades_reorder_cards`, exposta por `useCardMutations().reorder` (com otimista e rollback) e consumida por `useAcoesDemanda.mover` via `ordemDaColuna`. Nenhuma tabela nova é necessária aqui.
- Caixa de Entrada do Workspace: lê `demands`, que **não** tem campo de ordem manual.
- `/trabalho/inbox`: lista derivada de `solicitacoes`, ordenada pelo motor de prioridade em memória (`priority-engine.ts`), sem campo de ordem manual.

## Implementação

### 1. Banco (uma migração aditiva)

- `demands.ordem_manual integer null` e `solicitacoes.ordem_manual integer null`, com índice por ordenação.
- Sem novas tabelas; as políticas de acesso existentes já cobrem quem pode editar essas linhas.

### 2. Camada de dados

- `src/lib/atividades.ts`: manter `reorderCardsBulk` como está (já recebe `{ id, colunaId, ordem }[]`).
- Novo `src/lib/ordemManual.ts` com uma única função tipada `salvarOrdemManual(tabela: "demands" | "solicitacoes", itens: { id: string; ordem: number }[])`, gravando em lote por `upsert`.
- Novo hook `src/modules/demand-access/useReordenarFila.ts` (React Query) que envolve essa função com atualização otimista sobre a lista em cache e rollback no erro — mesmo padrão de `useCardMutations`.

### 3. Cálculo de índice (módulo puro, documentado e testado)

Novo `src/modules/workspace-demandas/ordenacao.ts`:

- `reordenarLista(ids: string[], ativo: string, sobre: string): string[]` — `arrayMove` com `oldIndex`/`newIndex` calculados por `indexOf`, tolerante a id ausente.
- `ordensDaLista(ids: string[]): { id: string; ordem: number }[]` — sequência densa 0..n-1, para nunca haver empate de posição.
- Testes em `__tests__/ordenacao.test.ts` cobrindo topo, meio, fim, lista de um item e id inexistente (complementando `posicaoNoBoard.test.ts`, que já existe).

### 4. Quadro Kanban (`BoardLente.tsx` + `KanbanCard.tsx`)

- `KanbanCard`: trocar `useDraggable` por `useSortable` (mesmos `attributes`/`listeners`), aplicando `transform`/`transition` para o deslizamento; `DragOverlay` segue como está.
- `BoardLente`: envolver os itens de cada coluna em `<SortableContext items={ids} strategy={verticalListSortingStrategy}>`; adicionar `closestCenter` como estratégia de colisão.
- `aoTerminar`: se `over` é um cartão da mesma coluna, calcular a nova sequência com `reordenarLista` e chamar `onMover({ demandaId, statusId, ordemDaColuna })` — o caminho de gravação já existente. Se `over` é outra coluna (ou um cartão dela), continuar movendo entre colunas, agora com a posição de inserção correta.

### 5. Caixas de Entrada

- Caixa de Entrada do Workspace: a lista já passa pelo `BoardLente`/`ListaLente`; o `onMover` do escopo "inbox" passa a chamar `useReordenarFila("demands", …)` quando a mudança é só de posição.
- `/trabalho/inbox` (`TaskList.tsx`/`TaskCard.tsx`): envolver a `<ul>` num `DndContext` + `SortableContext` vertical, cada item com `useSortable`, e gravar via `useReordenarFila("solicitacoes", …)`.
- Ordenação de leitura: `ordem_manual` primeiro (nulos ao fim), depois o critério automático atual. No `/trabalho/inbox` isso entra como passo final de `rankInbox`, para não perder score nem insights.

## Notas técnicas

- Tipagem estrita: nenhum `any`; os payloads de reordenação usam tipos exportados de `ordenacao.ts` e do hook.
- `@dnd-kit/core` e `@dnd-kit/sortable` já estão instalados — nenhuma dependência nova.
- Ordens densas (0..n-1) evitam empate; a RPC do quadro já é transacional.
