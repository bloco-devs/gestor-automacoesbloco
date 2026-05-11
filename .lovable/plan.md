## Objetivo

Resetar a senha de `riccellycivil@gmail.com` e orientar como definir uma nova.

## Opções

Existem duas formas. Escolha uma ao aprovar:

### Opção A — Enviar email de recuperação (recomendada)
- Eu chamo `supabase.auth.resetPasswordForEmail("riccellycivil@gmail.com")` (via uma execução pontual contra o Supabase do projeto), com `redirectTo` apontando para `/redefinir-senha`.
- Você recebe um email do Supabase (template padrão) com um link.
- Clica no link → cai na tela `/redefinir-senha` que já está implementada → define a nova senha você mesmo.
- Vantagem: você escolhe a senha, sem ninguém ver.
- Pré-requisito: a caixa do Gmail precisa receber o email (verificar spam).

### Opção B — Regenerar senha aleatória via edge function `bootstrap-dual-user`
- Eu invoco a função `bootstrap-dual-user` já existente.
- Ela gera uma senha forte aleatória, atualiza no Supabase Auth e retorna no JSON da resposta.
- Eu te mostro a senha **uma única vez** no chat.
- Você loga em `/auth` com essa senha e, se quiser, troca depois pelo fluxo "Esqueci minha senha".
- Vantagem: não depende de email chegar.
- Desvantagem: a senha trafega pelo chat.

## Como criar a nova senha (passo a passo, depois do reset)

**Se escolher A:**
1. Abra o email recebido (assunto padrão Supabase: "Reset Your Password").
2. Clique no link → abre `https://gestor-automacoesbloco.lovable.app/redefinir-senha`.
3. Digite a nova senha e a confirmação (mínimo 6 caracteres).
4. Clique em **Atualizar senha** → você é redirecionado para `/auth`.
5. Faça login com `riccellycivil@gmail.com` + a nova senha.

**Se escolher B:**
1. Eu te entrego a senha gerada no chat.
2. Vá em `/auth`, entre com `riccellycivil@gmail.com` + senha recebida.
3. Opcional: clique em **Esqueci minha senha** para definir uma sua via email.

## Fora do escopo
- Alterar templates de email do Supabase.
- Criar tela de "trocar senha" dentro do app autenticado (hoje só existe via fluxo de recovery).
