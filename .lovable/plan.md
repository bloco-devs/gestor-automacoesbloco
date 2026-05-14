## Objetivo
Criar 6 contas de **solicitante** com senhas fortes, retornando as credenciais ao final.

## Contas a criar (role: requester)
- atendimentoblocojp@gmail.com
- admblococonstrucoes@gmail.com
- planejamentoblococonstrucoes@gmail.com
- producaoblococonstrucoes@gmail.com
- rh@grupobloco.com.br
- blocolegalizacao@gmail.com

## Situação atual
Hoje o login é restrito a uma allowlist **hardcoded** em `src/hooks/useAuth.tsx` (`ALLOWED_ACCOUNTS`), que só permite `blococcomercial@gmail.com` e `riccellycivil@gmail.com` (ambos developers). Existe também a tabela `allowed_emails` no Supabase e a edge function `bootstrap-dual-user` que serve de modelo para criar usuários via Admin API.

Sem alterar a allowlist do frontend, os novos e-mails não conseguirão fazer login mesmo se o usuário existir no Supabase Auth.

## Passos

1. **Edge function `bootstrap-requesters`** (nova, baseada em `bootstrap-dual-user`):
   - Lista fixa dos 6 e-mails.
   - Para cada um:
     - Gera senha forte aleatória (24+ chars, com maiúscula, minúscula, número e símbolo).
     - Cria/atualiza o usuário no Auth com `email_confirm: true` e `user_metadata.nome` derivado do e-mail.
     - Faz `upsert` em `allowed_emails`.
     - **Não** insere em `user_roles` (solicitantes não são admin).
   - Retorna JSON com `[{ email, password }]`.
   - Invocada uma única vez para colher as senhas.

2. **Atualizar `src/hooks/useAuth.tsx`**: adicionar os 6 e-mails ao `ALLOWED_ACCOUNTS` com `role: "requester"` e um `nome` legível para cada um (ex.: "Atendimento JP", "Administrativo", "Planejamento", "Produção", "RH", "Legalização").

3. **Executar a function** e devolver as senhas geradas no chat, instruindo o usuário a trocá-las no primeiro acesso (link "Esqueci minha senha" já existente).

## Observações técnicas
- Não é necessária migração SQL — `allowed_emails`, `profiles` (via trigger `handle_new_user`) e RLS já suportam o fluxo.
- A function usa `SUPABASE_SERVICE_ROLE_KEY` (já configurada).
- Senhas serão exibidas **uma única vez** no retorno do chat; recomendo trocar imediatamente.