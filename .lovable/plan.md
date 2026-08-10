# Kanban: coluna única de concluídos + arrasto que não volta atrás

Dois defeitos no quadro principal (`/workspace`), confirmados na leitura do código.

## Ajuste 1 — "CONCLUÍDO" e "CONCLUÍDA" como duas colunas

A tela soma duas fontes (cartões de quadro e demandas do Help Desk) e funde colunas homônimas comparando o rótulo em minúsculas exatas. "Concluído" (coluna de quadro) e "Concluída" (grupo de demandas encerradas) são textos diferentes, então a fusão não acontece e o quadro desenha as duas.

O que muda:

- A fusão de grupos homônimos passa a comparar rótulos por uma forma canônica: sem acentos, minúsculas, e qualquer variante de conclusão ("concluído", "concluída", "finalizado", "feito", "done") colapsa numa chave única.
- A coluna resultante recebe o rótulo canônico **CONCLUÍDO** e permanece marcada como concluída, continuando a nascer recolhida como faixa estreita.
- Ao soltar um cartão nessa coluna, o destino continua sendo resolvido por rótulo, e cada cartão infere o alvo correto conforme sua origem: cartão de quadro tem o campo de conclusão marcado; demanda do Help Desk vai para o status `concluido`. Essa tradução por origem já existe e será mantida.

## Ajuste 2 — cartão volta ao lugar ao reordenar na mesma coluna

Na tela do desenvolvedor, o quadro calcula a nova sequência da coluna e a entrega ao manipulador de movimento, mas esse manipulador descarta a sequência e só troca de etapa. Reordenar dentro da mesma coluna, então, não grava nada e a lista volta à ordem do servidor no próximo render.

O que muda:

- O quadro passa a aplicar **atualização otimista local**: a nova sequência da coluna (calculada com `arrayMove`) é refletida imediatamente na tela e só é abandonada quando os dados do servidor chegam já com essa ordem (ou em caso de erro).
- A tela do desenvolvedor passa a persistir a posição: cartões de quadro pela regravação em bloco da coluna; demandas do Help Desk pela ordem manual. Assim a ordem sobrevive ao recarregar.
- Mover entre colunas continua igual, agora também gravando a posição de inserção.

## Detalhes técnicos

- `src/domain/demand/services/DemandaQuery.ts`: em `unirGruposHomonimos`, chave de fusão via normalização (NFD + remoção de diacríticos) com colapso das variantes de conclusão para `concluido`; rótulo de saída "Concluído" nesse caso. Cobrir com teste unitário em `src/domain/demand/__tests__/`.
- `src/modules/workspace-demandas/components/BoardLente.tsx`: estado `ordemLocal: Map<string, string[]>` aplicado sobre `colunas` no `useMemo`; `aoTerminar` usa `arrayMove` (via `reordenarLista`/`inserirNaLista`, já puros e testados), grava `ordemLocal` antes de chamar `onMover`, e limpa a entrada quando `grupos` chega com a mesma sequência. Tipagem estrita, sem `any`.
- `src/pages/DeveloperWorkspace.tsx`: `lidarComMovimento` passa a receber `ordem` e `ordemDaColuna` e repassá-los; usa `reorderCards` (RPC `atividades_reorder_cards`) para ids de cartão e `useReordenarFila("demands", ["demands"])` para demandas, separando os ids por presença de projeto em `projetoPorDemanda`.
- `src/modules/demand-access/useMoverDemanda.ts`: assinatura de `mover` ganha parâmetro opcional de posições, mantendo o comportamento atual quando ausente.

## Fora do escopo

Banco de dados, RLS, Edge Functions e o quadro de projeto (`WorkspaceDemandas`) permanecem com a lógica atual — este último apenas herda o otimismo local do `BoardLente`.
