# Arrasto entre colunas sem snap-back + Caixa de Entrada só com chamados

## 1. Mover cartão para outra coluna (fim do efeito elástico)

Hoje o quadro só é otimista quando o cartão é reordenado **dentro** da mesma coluna. Ao soltar numa coluna diferente, a tela espera a resposta do servidor: o cartão volta para a origem e só depois pula para o destino.

O que muda em `BoardLente.tsx`:

- Ao soltar em outra coluna, além de gravar, a tela assume na hora: o cartão sai da lista da coluna de origem e entra na posição exata da coluna de destino.
- Enquanto o servidor não confirmar, o cartão é desenhado no destino (o mesmo mecanismo já usado na reordenação vertical, agora cobrindo as duas colunas envolvidas e a troca de coluna do cartão).
- A verdade do servidor continua vencendo: quando a resposta chega igual, o estado local é descartado; se a gravação falhar, o cartão volta ao lugar real (comportamento correto).
- Nenhuma mudança no que é enviado ao banco — a mutação atual (coluna de destino + ordem final da coluna) permanece.

## 2. A fila de `/workspace` não lista mais tarefas de projeto

`/workspace` (a fila do desenvolvedor, "Hoje") soma duas fontes: os chamados do Helpdesk e **todos** os cartões de **todos** os quadros. É daí que vem a mistura: tarefas de Sprint/Projeto aparecendo na fila de triagem.

O que muda:

- A fila de `/workspace` passa a mostrar **apenas chamados** (a fila de triagem do Helpdesk). Tarefas de projeto continuam onde pertencem: dentro do quadro do projeto, em `/workspace/demandas/:projeto`.
- Contadores, filas ("Minhas", "Hoje"), sinais e o arrasto dessa tela passam a refletir só os chamados — sem números inflados por trabalho de outro contexto.

Consequência a confirmar na prática: quem usava `/workspace` para ver o próprio trabalho de projeto passará a abrir o quadro do projeto para isso.

## Detalhes técnicos

- `src/modules/workspace-demandas/components/BoardLente.tsx`
  - `aoTerminar`: no ramo de troca de coluna, gravar em `ordemLocal` a nova sequência da coluna de destino **e** da coluna de origem (sem o id movido), e registrar num novo estado `colunaLocalPorDemanda: Map<string, string>` a coluna otimista do cartão.
  - `colunas` (useMemo): antes de aplicar `ordemLocal`, reatribuir os itens cujo id está em `colunaLocalPorDemanda` (remover da coluna atual, inserir na coluna otimista), depois ordenar como já é feito.
  - `useEffect` de reconciliação: limpar a entrada de `colunaLocalPorDemanda` quando o servidor já colocar a demanda na coluna esperada (ou quando o grupo deixar de existir), junto da limpeza de `ordemLocal` que já existe.
  - Sem `onDragOver`: a estratégia continua "resolve no drop", que é suficiente e evita mutação de estado a cada pixel.
- `src/modules/demand-access/useTodasAsDemandas.ts`
  - Nova opção tipada `useTodasAsDemandas({ incluirCartoesDeProjeto?: boolean })` (padrão `true`, preserva chamadas existentes). Quando `false`, `fromAtividades` não é alimentado (`cards: []`), `projetoPorDemanda` fica vazio e as queries de cards/colunas/labels/capas são desligadas via `enabled` — menos tráfego, nada de cartões na lista.
  - `capacidades` permanece a união; os campos já são checados individualmente na UI.
- `src/pages/DeveloperWorkspace.tsx`
  - Passa `{ incluirCartoesDeProjeto: false }`. O caminho de gravação de ordem/movimento de cartões (`gravarOrdem`, RPC de posições) fica intacto para reuso, mas na prática só a fila global (`ordem_manual`, enum de status) é exercitada nesta tela.
- Verificação: `tsgo` + `vitest run` (as 4 falhas de `vocabulario.test.ts` são pré-existentes).
