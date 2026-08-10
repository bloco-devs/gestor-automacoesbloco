# Arrasto na Caixa de Entrada: descobrir a recusa real e parar de mentir na tela

## O que já está no código (verificado agora)

Três das correções pedidas já existem e não precisam ser refeitas:

- O destino já é traduzido para o valor exato de `demands.status`. Na Caixa de Entrada as colunas nascem de `STATUS_COLUMNS`, cujos ids são o próprio enum (`em_testes`, `em_desenvolvimento`, ...), e o agrupamento usa esse id. Não há UUID de coluna de quadro nesse caminho.
- A gravação já encadeia `.select("id")` depois do `.update()` e lança erro quando volta zero linha — tanto na troca de etapa quanto na gravação de posição (`ordem_manual`).
- O `onDragEnd` já espera a promessa: falhando, aparece o aviso e o cartão volta para a coluna e a posição de origem.

Ou seja: o sintoma que você descreve (grava nada, ninguém avisa, volta ao recarregar) não pode mais vir dessas três causas. Falta descobrir a recusa real do servidor — e ela tem um suspeito forte no banco.

## O suspeito: quem pode ESCREVER não pode LER de volta

As regras de acesso de `demands` são assimétricas:

- alterar: dono, responsável, **equipe** (papel `developer`/`administrador`) ou admin;
- ler: apenas dono, responsável ou admin — **equipe não está na lista**.

Consequência prática: um usuário de papel `developer` que arrasta uma demanda que não é dele nem está atribuída a ele **altera a linha, mas não recebe a linha de volta**. O `.select("id")` devolve vazio, o código conclui "sem permissão", mostra o aviso e devolve o cartão — enquanto o banco já mudou. A tela e o banco discordam nos dois sentidos, e é exatamente o tipo de falha que parece "silenciosa e aleatória" dependendo de quem está logado.

Isso é leitura de política, não de dado: **antes de mexer em qualquer regra eu reproduzo o arrasto no navegador, autenticado, e capturo a resposta real do PostgREST** (código, mensagem, linhas afetadas). Só com essa mensagem em mãos eu confirmo se a causa é essa assimetria ou outra.

## O que vou fazer

1. **Reproduzir e medir.** Sessão no navegador na Caixa de Entrada, arrastando um cartão entre etapas, com console e rede capturados; e uma leitura no banco antes/depois do mesmo cartão para saber se a linha mudou. O relatório separa "banco gravou" de "tela mostrou".
2. **Alinhar leitura e escrita em `demands`** (só se o passo 1 confirmar a assimetria): a política de leitura passa a incluir a equipe, do mesmo jeito que a de escrita já inclui — quem pode mover precisa poder ver o que moveu. Alteração de banco, então vai por migração e com sua aprovação.
3. **Atualizar o detalhe da demanda depois do movimento.** O stepper do detalhe é montado a partir do histórico de auditoria, que hoje não é invalidado quando o cartão é movido no quadro. Ao concluir o movimento, invalido também as chaves do detalhe daquela demanda (`auditoria` e `comentarios`), além da lista. Assim, clicar no cartão logo depois de mover mostra a etapa nova.
4. **Fechar o resto das promessas soltas.** Revisar o caminho de arrasto para que nenhuma escrita fique sem `await`/`catch`, e conferir a tipagem (`Promise<void>` em `onMover` ponta a ponta, sem `void` engolindo rejeição).

## Detalhes técnicos

- `src/modules/demand-access/useAcoesDemanda.ts`: após `statusDemand.mutateAsync` e `filaDeDemandas.reordenar`, invalidar `["demanda", demandaId, "auditoria"]` e `["demanda", demandaId, "comentarios"]` (prefixo `n` de `useFioDaDemanda`), além das chaves de lista já invalidadas por `useUpdateDemandStatus`.
- `src/modules/demands/service.ts` (`updateDemandStatus`) e `src/lib/ordemManual.ts`: mantidos; a checagem de linhas volta a ser confiável quando a política de leitura acompanhar a de escrita. Se o passo 1 mostrar outra recusa, ajusto aqui.
- Migração (aditiva, idempotente): recriar `demands_select_scoped` incluindo `is_equipe()`, preservando `deleted_at IS NULL` e o acesso de admin. Nada além disso.
- Verificação: `tsgo`, `vitest run`, sessão Playwright arrastando na Caixa de Entrada e releitura da linha no banco para confirmar `status` novo.
