# Kanban: avatares sem duplicata + animação ao cruzar colunas

Dois refinamentos visuais, sem tocar em banco, RLS ou Edge Functions.

## 1. Avatares duplicados no cartão

Hoje a lista de responsáveis exibida na capa vem de `atividades_card_membros` sem deduplicação: se o mesmo usuário aparece duas vezes no payload, o cartão mostra duas fotos iguais.

- Deduplicar por `user_id` na montagem da capa (`useCapasDosCards`), usando `Map`/`Set`, preservando a ordem de chegada.
- Deduplicação defensiva também no ponto de render do cartão (`KanbanCard`), antes do `.map()` dos avatares, para que qualquer outra fonte de capa fique protegida.
- O contador de excedentes ("+2") passa a contar a lista já deduplicada.

## 2. Animação ao cruzar para outra coluna (efeito Trello)

Hoje o cartão só troca de coluna no `onDragEnd`: enquanto o cursor está sobre a coluna vizinha, nada se move.

- Adicionar `onDragOver` ao `<DndContext>` de `BoardLente`.
- No handler: resolver a coluna do item arrastado e a coluna sob o cursor (seja o droppable da coluna, seja o cartão sob o cursor). Se forem diferentes, atualizar imediatamente o estado otimista já existente:
  - `colunaLocal` recebe `demandaId -> colunaDestino` (o cartão sai visualmente da origem);
  - `ordemLocal` recebe a nova sequência do destino (posição de inserção calculada por `inserirNaLista`) e a sequência da origem sem o cartão.
- Com o cartão já pertencendo à coluna de destino, o `verticalListSortingStrategy` daquela coluna abre espaço durante o arrasto.
- `onDragEnd` continua sendo o único responsável pela mutação (`onMover`); ele apenas confirma o estado que o `onDragOver` já deixou pronto, evitando gravações repetidas durante o movimento.
- O `useEffect` de reconciliação existente segue descartando o otimismo quando o servidor concorda (ou vence, se discordar), e `onDragCancel` limpa o otimismo pendente para o cartão voltar à origem.

## Notas técnicas

- Arquivos: `src/modules/workspace-demandas/components/BoardLente.tsx`, `src/modules/workspace-demandas/components/KanbanCard.tsx`, `src/modules/demand-access/useCapasDosCards.ts`.
- Tipagem estrita: handler tipado como `(e: DragOverEvent) => void`, sem `any`; leitura de `over.data.current` com tipo estreito, como já feito no `onDragEnd`.
- Sem novas dependências e sem alteração de contrato dos hooks de dados.
