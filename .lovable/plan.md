## Objetivo

Permitir que qualquer usuário autenticado e autorizado (presente em `allowed_emails`) consiga **visualizar todas** as solicitações e soluções já cadastradas — incluindo as criadas anteriormente por `blococcomercial@gmail.com` e `riccellycivil@gmail.com`. A capacidade de **criar/editar/excluir** continua exatamente como está hoje (dono edita o próprio; admin edita tudo).

## Diagnóstico

Hoje, na tabela `solicitacoes`, as únicas políticas de SELECT são:
- `Admins can view all solicitacoes` → só admins
- `Owners can view their solicitacoes` → só o dono (`auth.uid() = user_id`)

Como os novos emails (Adriano, Ailton, Vitória, …, Fernanda) **não são admin** e **não são donos** das solicitações antigas, eles simplesmente não enxergam nada criado por blococcomercial/riccellycivil. O mesmo padrão se repete em `demanda_solucoes`, `demanda_tasks`, `solucao_tasks`, `demanda_melhorias` (várias dessas hoje são restritas a admin).

## Mudanças no banco (migração SQL)

Adicionar uma política **permissiva** de SELECT em cada tabela do domínio para qualquer usuário autorizado (`private.is_allowed_user()`). Não removemos nenhuma política existente — só ampliamos a leitura.

Tabelas afetadas:

- `public.solicitacoes` → nova policy SELECT: `private.is_allowed_user()`
- `public.demanda_solucoes` → já existe policy equivalente, **sem alteração**
- `public.demanda_tasks` → nova policy SELECT: `private.is_allowed_user()` (hoje só admin lê)
- `public.solucao_tasks` → nova policy SELECT: `private.is_allowed_user()` (hoje só admin/dono lê)
- `public.demanda_melhorias` → já permite, **sem alteração**
- `public.solicitacoes_score_history` → nova policy SELECT: `private.is_allowed_user()` (opcional, para coerência do histórico exibido)

Políticas de INSERT/UPDATE/DELETE permanecem intactas, então:
- Solicitante continua só editando as próprias solicitações.
- Apenas admin segue podendo alterar tasks, score, etc.

## Mudanças no frontend

Nenhuma mudança estrutural obrigatória. Pontos a confirmar depois da migração:

- `MinhasDemandas` / `RequesterDashboard` continuam filtrando por `user_id = auth.uid()` no código, então o solicitante **continua vendo apenas as próprias** nessas telas (comportamento esperado).
- Caso você queira que o Solicitante tenha uma tela "Todas as solicitações / Catálogo de soluções" para enxergar o histórico geral, isso vira um passo seguinte (nova rota + listagem somente leitura). Hoje as rotas `/solicitacoes` e `/solucoes` são restritas a `developer`.

## Riscos / observações

- Estamos expondo conteúdo de **todas** as solicitações (título, descrição, solicitante, etc.) para qualquer usuário autorizado. Confirmado pela sua escolha de "ver TODAS (somente leitura)".
- Não há exposição de dados sensíveis tipo senha — `profiles` e `user_roles` continuam com as políticas atuais.
- A função `private.is_allowed_user()` já é `SECURITY DEFINER` e é usada em várias outras tabelas, então o padrão é consistente.

## Próximo passo

Ao aprovar este plano, eu gero a migração SQL com as novas policies de SELECT e, em seguida, valido entrando como um dos novos usuários para confirmar que ele passa a ver as solicitações/soluções antigas.
