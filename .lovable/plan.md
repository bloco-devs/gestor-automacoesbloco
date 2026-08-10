# Comentários editáveis, boas-vindas automáticas e lateral do Blink redesenhada

Três melhorias na tela de detalhe da demanda (`/demandas/:id`), onde a conversa (o "fio") e a coluna lateral do Blink já existem.

## 1. Editar e excluir o próprio comentário

Hoje uma mensagem no fio é definitiva: não há como corrigir um erro de digitação nem apagar algo enviado por engano. O banco já permite (as políticas de segurança liberam alterar e excluir apenas o comentário do próprio autor), só falta a interface.

- Cada fala escrita por uma pessoa passa a mostrar, **só ao passar o mouse**, dois botões discretos: lápis (editar) e lixeira (excluir).
- Eles aparecem **apenas para o autor** da mensagem. Mudanças de status, anexos, o pedido original e mensagens do sistema não recebem ações.
- Editar troca o texto por uma caixa de edição no mesmo lugar, com "Salvar"/"Cancelar" e envio por ⌘/Ctrl+Enter. Depois de salvo, a mensagem exibe a marca "(editado)".
- Excluir abre uma confirmação curta antes de apagar.
- Ambas as ações atualizam a conversa na hora (atualização otimista) e o fio já se sincroniza em tempo real para os outros participantes.

## 2. Primeira resposta automática do sistema

Ao registrar uma demanda nova pelo assistente, ela nasce sem nenhuma mensagem — quem abriu fica sem confirmação de que alguém vai olhar.

- Toda demanda criada passa a receber automaticamente a mensagem:
  "Olá! A sua demanda foi registada com sucesso e encontra-se na nossa fila de triagem. Em breve, um membro da nossa equipa técnica irá assumi-la."
- Ela aparece como primeira mensagem do fio, identificada como **Sistema** (avatar próprio com ícone de robô e etiqueta "automático"), visualmente distinta de pessoas e do Blink.
- Não pode ser editada nem excluída por ninguém pela interface.

## 3. Redesign da coluna lateral (Blink)

A lateral hoje é uma pilha de seções separadas por linhas finas, com pouca hierarquia e alertas em amarelo forte.

- Cada assunto (Próximo passo, O que está acontecendo, De quem é a vez, Já se sabe disso, Quem poderia assumir, Detalhes) vira um **cartão** com cantos arredondados, borda suave e sombra leve.
- Espaçamento generoso entre os cartões para o conteúdo respirar.
- Alertas deixam de usar fundo amarelo sólido: passam a etiquetas suaves (fundo translúcido + texto na mesma cor), inclusive para risco, atraso e silêncio.
- O cabeçalho "Blink" fica fixo no topo da coluna enquanto se rola o painel, e no layout de duas colunas a lateral continua com rolagem própria — ela acompanha a leitura da conversa à esquerda. Em telas estreitas, onde a página rola inteira, o painel segue empilhado abaixo da conversa.
- Nenhuma informação, ação ou comportamento atual é removido.

## Detalhes técnicos

**Comentários (1)**
- `src/modules/demands/timeline-service.ts`: novas funções `updateComment(id, content)` e `deleteComment(id)` sobre `demand_comments` (as políticas `Author updates/deletes own comments` já cobrem a autorização).
- `src/domain/demand/services/fio.ts`: `Evento` ganha campos opcionais `comentarioId?: string`, `editavel?: boolean` e `editadoEm?: string | null` (tipagem estrita, sem impacto em mudanças/anexos).
- `src/modules/demand-access/useFioDaDemanda.ts`: marca `editavel` comparando `c.user_id` com o usuário autenticado, expõe `editarComentario` / `excluirComentario` com atualização otimista via `queryClient.setQueryData` e rollback em erro.
- `src/modules/workspace-demandas/demanda/Fio.tsx`: `Fala` recebe `onEditar`/`onExcluir`; ações em `opacity-0 group-hover:opacity-100 focus-within:opacity-100`; exclusão usa `AlertDialog` do shadcn; edição usa `Textarea` local.
- `src/modules/workspace-demandas/DemandaDetalhe.tsx`: repassa os novos handlers.

**Mensagem do sistema (2)**
- Migração aditiva: coluna `demand_comments.is_system boolean not null default false` e trigger `after insert on demands` (SECURITY DEFINER) que insere a mensagem com `user_id = null`, `is_system = true`, `is_internal = false`. Feito no servidor porque a política de inserção do cliente exige `auth.uid() = user_id` — assim a mensagem não pode ser forjada nem duplicada, e vale para demandas criadas por qualquer caminho (assistente, portal, edge functions).
- Ajuste na política de leitura de `demand_comments` para incluir comentários de sistema visíveis a quem pode ver a demanda (hoje a regra depende de `user_id`, que será nulo).
- `useFioDaDemanda.ts` mapeia `is_system` para um autor "Sistema" (`ia: false`, `sistema: true`) e `editavel: false`; `Fio.tsx` renderiza avatar com ícone `Bot` e etiqueta.

**Lateral (3)**
- `src/modules/workspace-demandas/demanda/CopilotoDaDemanda.tsx`: `Bloco` passa a usar `Card`/`CardContent` (`p-4 rounded-xl border border-border/50 shadow-sm`), container com `flex flex-col gap-4 p-4`, header `sticky top-0 z-10 bg-background/95 backdrop-blur`.
- Alertas com `Badge` em variante suave (`bg-amber-500/10 text-amber-500`, `bg-destructive/10 text-destructive`) — adicionadas como variantes no `badgeVariants` para não espalhar cores cruas nos componentes.
- `Contexto.tsx` (bloco Detalhes) recebe o mesmo tratamento de cartão para não ficar visualmente órfão dentro do painel.
