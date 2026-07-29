# Fase 4 — Mover cartões (drag and drop) no Kanban de /workspace

Objetivo: liberar o arrasto de cartões entre colunas em `/workspace` e persistir a mudança na fonte correta de cada demanda.

## O problema que a orquestração precisa resolver

A tela `/workspace` soma DUAS fontes (confirmado em `useTodasAsDemandas`): cartões de quadros (`atividades_cards`, status = id da coluna, um UUID por quadro) e tickets da fila global (`demands`, status = enum `backlog | a_fazer | em_desenvolvimento | em_testes | homologacao | concluido`).

O `BoardLente` entrega `onMover({ demandaId, statusId })`, onde `statusId` é o id da coluna de destino desenhada na tela. Esse id pode ser:

- o id de um grupo real vindo de um quadro (UUID de coluna de UM quadro específico);
- o enum de `demands`;
- um id sintético `esteira:<rótulo>` quando a coluna está vazia.

Ou seja, repassar o `statusId` cru para a fonte falharia na maioria dos casos (UUID de outro quadro, ou id sintético). A tradução tem que ser feita por RÓTULO, que é justamente o que une as duas fontes hoje (`unirGruposHomonimos`).

## O que será feito

1. **Nova ação de mover para fonte mista** — arquivo novo `src/modules/demand-access/useMoverDemanda.ts`, no mesmo padrão do `useAssumirDemanda` já existente (que resolveu o mesmo problema para "Assumir"). Ele recebe `demandaId`, `projetoId | null` e o RÓTULO da etapa de destino, e decide:
   - com `projetoId` → resolve a coluna daquele quadro cujo nome casa com o rótulo (lendo as colunas já em cache) e chama `updateCard` com a nova coluna;
   - sem `projetoId` → mapeia rótulo → enum de `demands` e chama a mutação de status já existente.
   - Se o quadro não tiver coluna equivalente ao rótulo, a ação não é executada e um toast explica ("Este projeto não tem a etapa X").
   - Estado `movendo(id)` para o cartão não sofrer duplo disparo.

2. **`src/pages/DeveloperWorkspace.tsx`** — orquestração:
   - `podeMover={true}`;
   - `onMover` passa a ser `lidarComMovimento`, que resolve o rótulo da etapa de destino a partir do `statusId` recebido (grupos reais + ids sintéticos `esteira:`), busca o projeto em `projetoPorDemanda` e delega ao hook;
   - toast de erro no padrão já usado por "Assumir".

3. **Sem alterar** `BoardLente.tsx`, o domínio, migrations ou Edge Functions.

## Detalhes técnicos

- Mapa rótulo → enum de `demands`: Backlog→`backlog`, A Fazer→`a_fazer`, Em Desenvolvimento→`em_desenvolvimento`, Em Testes→`em_testes`, Homologação→`homologacao`, Concluído→`concluido`. Comparação normalizada (minúsculas, sem acento/espaço extra), igual ao `normalizar` já usado na esteira.
- Cartões de quadro: a coluna de destino é buscada por nome dentro do MESMO `boardId` do cartão; nunca se usa o id de coluna de outro quadro.
- Invalidação de cache: `atividadesKeys.all` para cartões (mesma estratégia do `useAssumirDemanda`) e a mutação de `demands` já invalida sozinha.
- "Concluído" continua sendo a faixa lateral nativa; soltar um cartão nela usa a mesma tradução (campo `concluido` no quadro, enum em `demands`).

## Observação

A regra "mexer só no `DeveloperWorkspace.tsx`" não se sustenta aqui: a ação `mover` de `useAcoesDemanda` é ligada a UM escopo fixo (um projeto ou a fila global), e esta tela tem demandas de vários quadros ao mesmo tempo — hooks não podem ser chamados por cartão. Por isso o hook novo, exatamente como foi feito na Fase 3.
