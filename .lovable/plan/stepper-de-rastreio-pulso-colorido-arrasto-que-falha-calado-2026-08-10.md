# Stepper de rastreio + pulso colorido + arrasto que falha calado

## 1. Stepper de rastreio no topo da demanda

Hoje o andamento é uma fila de bolinhas pequenas com rótulos de pesos diferentes — funciona para quem conhece o pipeline, e confunde o solicitante.

O que muda em `Progresso.tsx` (só apresentação, mesmos dados da auditoria):

- Passos maiores e alinhados: cada etapa ganha uma marca redonda de tamanho legível, com linha de ligação contínua entre elas (a linha antes da etapa atual fica sólida; depois dela, apagada).
- Etapa cumprida recebe um "check" em vez de um ponto cinza — o olho lê "isto já passou" sem comparar tons.
- Etapa pulada continua vazada e riscada; etapa futura continua apagada. Nada de verde no que ninguém fez.
- Os rótulos continuam **exatamente** os das colunas/status: nada é renomeado.
- A contagem de tempo (dias na etapa, dias que levou) e o aviso de retrabalho permanecem.

## 2. Pulso da etapa atual com a cor da etapa

A etapa atual hoje pulsa sempre na cor primária. Passa a pulsar na cor do **significado** da etapa, a mesma que o cabeçalho da coluna já usa no quadro: âmbar para trabalho em curso, azul para revisão/testes, verde para concluído, vermelho para parado, cinza para etapa comum.

- Anel externo animado (`animate-ping`) mais o ponto central, ambos na cor do tom.
- A pastilha com o tempo ("há 19 dias") acompanha a mesma cor.

## 3. Arrasto na Caixa de Entrada que falha sem avisar

Confirmado na leitura do código (a causa raiz do lado do servidor ainda **não** está confirmada):

- `WorkspaceDemandas` chama a gravação do arrasto descartando a promessa (`void acoes.mover(...)`). Se o servidor recusar, ninguém é avisado: não há aviso na tela nem volta do cartão.
- O estado otimista do quadro só é liberado quando o servidor **concorda**. Se a gravação falhar, o cartão fica desenhado na coluna nova para sempre, até recarregar a página — é exatamente o sintoma de "moveu e não salvou".
- A gravação da posição na fila global (`ordem_manual`) não verifica se alguma linha foi realmente alterada. Uma recusa de permissão devolve sucesso com zero linhas, ou seja, silêncio. A troca de etapa já tem essa verificação; a posição não.

O que muda:

- O arrasto passa a esperar o resultado. Falhando: aviso claro ("Não foi possível mover esta demanda…") e o cartão **volta** para a coluna e a posição de origem na hora.
- A gravação de posição passa a reclamar quando nenhuma linha foi alterada, com a mesma mensagem de permissão que a troca de etapa já usa.
- Depois disso, reproduzo o arrasto na Caixa de Entrada no navegador para ver a mensagem real do servidor (se houver) e, se ela apontar para uma regra de acesso, volto com o ajuste necessário — sem mexer em banco sem sua autorização.

## Detalhes técnicos

- `src/modules/workspace-demandas/demanda/Progresso.tsx`: reescrever `Marca` e o `<li>` para o layout de stepper; importar `tomDaEtapa` de `@/domain/demand` e `PALETA` de `../components/KanbanCard` para derivar `texto`/`fundo`/`regua` por etapa. Sem mudança de tipos (`Progressao`/`Etapa` intactos).
- `src/modules/workspace-demandas/WorkspaceDemandas.tsx`: `onMover` passa a `async` com `try/catch` + `toast` destrutivo; em erro, chama um novo callback de rollback exposto por `BoardLente`.
- `src/modules/workspace-demandas/components/BoardLente.tsx`: `aoTerminar` guarda o par (coluna de origem, ordem de origem) e, no rejeito da promessa devolvida por `onMover`, limpa `colunaLocal`/`ordemLocal` daquele cartão restaurando as duas colunas envolvidas. `onMover` muda de `void` para `Promise<void>` na tipagem.
- `src/lib/ordemManual.ts`: `salvarOrdemManual` passa a usar `.select("id")` por linha e lançar quando o retorno vem vazio.
- Verificação: `tsgo`, `vitest run` e uma sessão Playwright arrastando um cartão na Caixa de Entrada com o console capturado.
