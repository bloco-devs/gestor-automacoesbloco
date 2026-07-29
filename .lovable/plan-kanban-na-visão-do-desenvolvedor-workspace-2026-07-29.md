# Kanban na visão do desenvolvedor (/workspace)

Trocar a lista em acordeão da tela "Hoje" por um quadro Kanban, reusando o componente de quadro que já existe no workspace de projeto. Nenhuma mudança de banco, de Edge Function ou da camada de leitura de dados.

## O que muda na tela

- A barra de filas no topo (Minhas, Todas, Não atribuídas, Em risco...) continua igual, com as mesmas contagens.
- Abaixo dela, no lugar da lista com blocos expansíveis, aparece o quadro com colunas lado a lado: Backlog, A Fazer, Em Desenvolvimento, Em Testes, Homologação, Concluído.
- Colunas sem nenhuma demanda continuam visíveis — é o vazio que informa que ninguém está em testes, por exemplo.
- Colunas de quadros importados com nomes fora dessa esteira (colunas customizadas) aparecem no fim, para nenhum dado sumir da tela.
- A coluna de concluídas nasce recolhida.
- Clicar num cartão continua abrindo `/demandas/:id` (com `?projeto=` quando a demanda vem de um quadro).
- O quadro é somente leitura nesta entrega: não há arrastar entre colunas.
- A visão em lista sai de vez desta tela (o componente segue em uso no workspace de projeto).

## Como as colunas são formadas

A tela já agrupa as demandas por status hoje — o mesmo agrupamento passa a alimentar o quadro, sem cálculo novo:

1. `aplicarFila` recorta as demandas conforme a fila escolhida (inalterado).
2. `agrupar(..., "board")` agrupa por `status.id`, ordenando por categoria (aberta → andamento → espera → concluída) e depois pela ordem da etapa.
3. `unirGruposHomonimos` funde grupos de mesmo rótulo vindos das duas fontes — a coluna "Backlog" de um quadro e o status `backlog` da tabela `demands` viram uma coluna só.
4. Uma esteira canônica de rótulos é montada para garantir as colunas vazias: para cada etapa da esteira procura-se o grupo correspondente pelo rótulo normalizado; havendo grupo, usa-se o id dele; não havendo, entra um id sintético e a coluna renderiza vazia.

## Detalhes técnicos

Arquivo tocado: `src/pages/DeveloperWorkspace.tsx` (apenas ele).

- Remover o import e a renderização de `ListaLente`; importar `BoardLente` de `@/modules/workspace-demandas/components/BoardLente`.
- Manter `useTodasAsDemandas`, `usePreferencia("hoje:fila")`, `contarFilas`, `aplicarFila`, `agrupar`, `unirGruposHomonimos` e `sinaisUteis` exatamente como estão.
- Novo `useMemo` que deriva `etapas: EtapaDaFonte[]` a partir dos grupos unidos + uma constante local com a ordem canônica das etapas (Backlog, A Fazer, Em Desenvolvimento, Em Testes, Homologação, Concluído). Esse cálculo é local à página porque `useTodasAsDemandas` soma duas fontes e não expõe `etapas` — e não será alterado.
- `BoardLente` exige `onMover` e `podeMover`: passar `podeMover={false}` e um `onMover` no-op estável. Com `podeMover` falso os cartões não recebem `useDraggable` ativo.
- Layout: o contêiner atual usa `overflow-y-auto` com padding, o que quebraria a rolagem horizontal do quadro. Trocar por um contêiner `min-h-0 flex-1` (mesmo padrão de `WorkspaceDemandas` na lente board), deixando a rolagem por conta do próprio quadro e de cada coluna.
- Skeleton de carregamento e textos de estado vazio preservados, com a redação ajustada ao contexto de quadro.

## Fora do escopo

Banco, RLS, Edge Functions, `demand-access`, e qualquer ação de escrita (mover, atribuir). Arrastar entre colunas fica como próximo passo, dependendo de uma camada de mover que traduza o destino para coluna de quadro ou enum de status.
