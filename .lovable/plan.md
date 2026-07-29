# Corrigir "Concluído" duplicado no quadro do desenvolvedor

Na tela `/workspace`, a coluna "Concluído" aparece duas vezes: uma coluna normal vazia (criada pela esteira canônica) e a faixa estreita recolhida que o quadro já monta sozinho para grupos concluídos.

## Causa

A esteira canônica da página inclui o rótulo "Concluído". Quando não há grupo com esse rótulo exato, a página cria uma etapa sintética com id inventado, e o quadro desenha uma coluna vazia. Como a coluna sintética não tem o marcador de "concluído", ela nunca nasce recolhida — enquanto o grupo real de concluídas, com rótulo diferente (ex.: vindo do quadro importado), entra como coluna extra e vira a faixa recolhida. Resultado: duas presenças de "Concluído" na tela.

## O que muda

- A esteira canônica passa a ter cinco etapas: Backlog, A Fazer, Em Desenvolvimento, Em Testes, Homologação. "Concluído" sai da lista — deixa de existir coluna vazia para concluídas.
- Os grupos concluídos continuam sendo entregues ao quadro normalmente; como não estão na esteira, o quadro os desenha ao final e já os inicia recolhidos, que é o comportamento nativo desejado.
- Nada mais muda: filas, contagens, agrupamento, navegação ao clicar e o modo somente leitura seguem iguais.

## Detalhes técnicos

Arquivo tocado: `src/pages/DeveloperWorkspace.tsx` (apenas ele).

- Remover `"Concluído"` da constante `ESTEIRA`.
- No `useMemo` de `etapas`, além de casar por rótulo normalizado, ignorar qualquer grupo marcado como concluído (`grupo.concluido`) ao resolver uma etapa da esteira — assim um grupo de concluídas com rótulo homônimo nunca é promovido a coluna da esteira.
- Ajustar o comentário do bloco para descrever a nova regra (a esteira cobre apenas as etapas em andamento; concluídas ficam a cargo da faixa recolhível do quadro).

## Fora do escopo

`BoardLente`, camada de dados, banco, RLS e Edge Functions permanecem intocados.
