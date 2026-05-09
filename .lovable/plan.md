## Objetivo

Adicionar fluxo "Esqueci minha senha" usando o sistema nativo do Supabase Auth, restrito aos emails autorizados do app.

## Mudanças

### 1. `src/pages/Auth.tsx`
- Adicionar link **"Esqueci minha senha"** abaixo do campo de senha.
- Ao clicar, abre um `Dialog` (shadcn) com um input de email e botão "Enviar link de recuperação".
- Valida com Zod e checa se o email está na lista `ALLOWED_ACCOUNTS` (mesma já usada em `useAuth`); se não estiver, mostra toast de erro sem chamar o Supabase.
- Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${window.location.origin}/redefinir-senha })`.
- Toast de sucesso: "Se o email for válido, enviaremos um link de recuperação."

### 2. Nova página `src/pages/RedefinirSenha.tsx`
- Rota pública `/redefinir-senha`.
- Detecta sessão de recovery via `supabase.auth.onAuthStateChange` (evento `PASSWORD_RECOVERY`) — Supabase já consome o token do hash da URL.
- Form com **nova senha** + **confirmar senha** (Zod: mínimo 6, máximo 128, iguais).
- Submit: `supabase.auth.updateUser({ password })`, depois `signOut()` e redireciona para `/auth` com toast "Senha atualizada".
- Se o usuário acessar a rota sem token de recovery válido, exibe estado "Link inválido ou expirado" com botão para voltar.

### 3. `src/App.tsx`
- Registrar rota pública `/redefinir-senha` (fora do `ProtectedRoute`).

### Detalhes técnicos
- Usar componentes existentes (`Dialog`, `Input`, `Label`, `Button`, `Card`, `useToast`).
- Sem mudanças no banco, sem novas funções edge, sem novos secrets.
- Emails de recuperação seguem o template padrão do Supabase (não vamos configurar templates customizados nem domínio próprio agora).
- Mantém a restrição de logins autorizados: o `loadProfile` já bloqueia qualquer email fora da lista após o login, então mesmo que alguém acione recovery indevidamente, não consegue usar o app.

### Fora do escopo
- Templates de email customizados / domínio próprio.
- Captcha / rate limiting adicional.
- Tela de "primeiro acesso" para criação de conta.
