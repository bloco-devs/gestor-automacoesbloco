## Objetivo

Replicar no projeto atual o fluxo robusto de recuperação de senha do sistema 'Gestão de Processo', garantindo que o link enviado por email sempre abra direto a tela de redefinição do app publicado (sem cair na tela de login, sem perder o token, e sem ser sequestrado por outras rotas/guards).

## Problemas do fluxo atual

O `RedefinirSenha.tsx` atual depende exclusivamente do evento `PASSWORD_RECOVERY` do Supabase. Isso falha em vários cenários comuns:

1. O `redirectTo` usa `window.location.origin`, então um reset solicitado no preview gera link para o preview (que muitas vezes redireciona para `/auth` e descarta o token).
2. Se o usuário já estiver logado, o `AuthProvider` carrega o perfil e o usuário é jogado para `/dashboard`/`/minhas-solicitacoes` antes do formulário de nova senha aparecer.
3. Tokens no hash (`#access_token=...&type=recovery`) ou code no query (`?code=...`) podem ser consumidos pelo `onAuthStateChange` em outra rota e perdidos.
4. Não há um "guard" que force o usuário a permanecer em `/redefinir-senha` até concluir o fluxo.

## Solução (espelhada do projeto de referência)

### 1. Fixar destino do link de reset
Em `src/pages/Auth.tsx`, no `handleReset`, trocar o `redirectTo` de `${window.location.origin}/redefinir-senha` para a URL publicada fixa:

```
https://gestor-automacoesbloco.lovable.app/redefinir-senha
```

Encapsular numa função `getPasswordResetRedirectUrl()` (em `useAuth.tsx` ou em um util) para centralizar.

### 2. Capturar o callback de auth antes do React montar
Criar `src/lib/capture-auth-callback.ts`:
- Lê `window.location.hash` e `window.location.search` no carregamento do módulo.
- Se encontrar `access_token + refresh_token` (com `type=recovery` ou ausente/não-signup), ou `?code=...` em `/redefinir-senha`, grava `sessionStorage["bloco:password-recovery"] = "1"`.
- Executado imediatamente (top-level) e importado como primeira linha de `src/main.tsx`.

### 3. Helpers de detecção de recovery
Criar `src/lib/auth-recovery.ts` com:
- `PASSWORD_RECOVERY_KEY`
- `hasAuthTokensInHash`, `hasAuthCodeInSearch`, `isRecoveryTypeInUrl`
- `markPasswordRecoveryIntent()`
- `getAuthCallbackError(hash, search)` → mensagem para `otp_expired` / `access_denied`
- `isPasswordRecoveryIntent({ pathname, hash, search })` → verdadeira se sessionStorage marcado, ou URL contém `type=recovery`, ou tokens na URL em `/redefinir-senha`.

### 4. AuthProvider: detectar recovery e redirecionar
Em `src/hooks/useAuth.tsx`, dentro do listener `onAuthStateChange`:
- Se `event === "PASSWORD_RECOVERY"` ou (`SIGNED_IN` e flag em sessionStorage), marcar intent e `window.location.replace("/redefinir-senha")` caso não esteja lá.
- Pular o `loadProfile` durante recovery para não disparar redirecionamentos de role.

### 5. RecoveryGuard
Criar `src/components/RecoveryGuard.tsx` que, em qualquer rota diferente de `/redefinir-senha`, redireciona para `/redefinir-senha` se `isPasswordRecoveryIntent()` for verdadeiro. Renderizado dentro do `<AuthProvider>` no `App.tsx`, antes das `<Routes>`.

### 6. ProtectedRoute
Em `src/components/ProtectedRoute.tsx`, antes de checar `session`, se `isPasswordRecoveryIntent()` for verdadeiro, redirecionar para `/redefinir-senha` preservando `search`+`hash`.

### 7. RedefinirSenha
Em `src/pages/RedefinirSenha.tsx`:
- Substituir a checagem por timeout pelo helper `isPasswordRecoveryIntent()` + escuta do evento `PASSWORD_RECOVERY`.
- Usar `getAuthCallbackError` para mostrar mensagem clara quando o link estiver expirado.
- Ao concluir com sucesso: `sessionStorage.removeItem(PASSWORD_RECOVERY_KEY)`, `signOut`, navegar para `/auth`.

### 8. Auth.tsx
- Se a página `/auth` for carregada com tokens/code de recovery na URL (caso o provedor de email reescreva o link), redirecionar imediatamente para `/redefinir-senha` preservando `search+hash`.

## Detalhes técnicos

- Rota e nome do arquivo continuam `/redefinir-senha` e `RedefinirSenha.tsx` (consistência com o projeto).
- Nenhuma migração de banco necessária.
- Nenhum impacto em RLS, edge functions, ou Supabase Auth settings (basta que a URL publicada esteja em "Redirect URLs" do Supabase — verificar e instruir o usuário se necessário).
- A URL fixa publicada é `https://gestor-automacoesbloco.lovable.app`.

## Arquivos a criar
- `src/lib/auth-recovery.ts`
- `src/lib/capture-auth-callback.ts`
- `src/components/RecoveryGuard.tsx`

## Arquivos a editar
- `src/main.tsx` (importar capture-auth-callback como primeira linha)
- `src/App.tsx` (montar `<RecoveryGuard />` dentro do `AuthProvider`)
- `src/hooks/useAuth.tsx` (tratar recovery no listener; expor `getPasswordResetRedirectUrl`)
- `src/pages/Auth.tsx` (usar URL fixa no `resetPasswordForEmail`; redirecionar se tokens chegarem aqui)
- `src/pages/RedefinirSenha.tsx` (usar helpers, tratamento de erro, signOut + redirect ao final)
- `src/components/ProtectedRoute.tsx` (curto-circuito para recovery)

## Validação manual

1. Solicitar reset com a tela aberta no preview.
2. Abrir o email → clicar no link → confirmar que abre `https://gestor-automacoesbloco.lovable.app/redefinir-senha` com o formulário visível, mesmo se já houver sessão ativa.
3. Definir nova senha → logout automático → login com a nova senha.
4. Tentar abrir um link expirado → ver mensagem clara de "link expirado".
