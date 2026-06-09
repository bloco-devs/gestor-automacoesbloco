## Diagnóstico

Analisei os logs de autenticação e o código atual. O que está acontecendo:

1. O e-mail de recuperação é enviado normalmente (`mail.send` ok).
2. O link é aberto e o `/verify` do Supabase responde **303** (sucesso) na primeira chamada.
3. Logo depois o mesmo `/verify` é chamado de novo e retorna **403 "One-time token not found"** — o token de uso único já foi consumido.

Isso é o sintoma clássico de duas causas combinadas:

- **Token consumido por scanner de e-mail / pré-visualização** (Outlook, antivírus corporativo, WhatsApp Web etc.) antes do usuário clicar. Quando o usuário clica de fato, o token já foi queimado.
- **Fluxo implícito (hash `#access_token`)** atualmente em uso é frágil: depende de o navegador preservar o fragmento, e o `RedefinirSenha.tsx` faz um `setTimeout(1500)` que pode marcar o link como inválido antes do evento `PASSWORD_RECOVERY` chegar.

Além disso, faltam validações importantes na URL de retorno (a página redireciona para `/auth` em caso de sessão pré-existente em vez de tratar o recovery), e não há opção clara de reenviar o link quando ele falha.

## O que vou fazer

### 1. Trocar o fluxo de auth para PKCE

No `src/integrations/supabase/client.ts` adicionar `flowType: 'pkce'` e `detectSessionInUrl: true`. O PKCE usa `?code=...` na query string (não no hash), o que:
- é resistente a scanners de e-mail (o code só funciona com o verifier que está no `localStorage` do navegador do usuário);
- gera URLs estáveis que funcionam mesmo com redirecionamentos intermediários.

### 2. Reescrever `/redefinir-senha` para ser robusta

Nova lógica em `src/pages/RedefinirSenha.tsx`:

- Detectar três formatos de retorno e tratar cada um:
  - `?code=...` (PKCE) → `supabase.auth.exchangeCodeForSession(code)`
  - `#access_token=...&type=recovery` (implícito legado) → `setSession`
  - `?error=...&error_description=...` (link expirado/inválido vindo do Supabase) → mostrar mensagem clara
- Remover o `setTimeout` de 1500 ms; usar estado determinístico baseado no resultado das chamadas acima e no evento `PASSWORD_RECOVERY`.
- Validar senha com regras mais fortes: mínimo 8 caracteres, ao menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial; mostrar indicador visual de força.
- Botão "mostrar/ocultar senha" nos dois campos.
- Botão "Reenviar link de recuperação" quando o link estiver inválido/expirado, que volta para `/auth` já com o e-mail pré-preenchido e abre o diálogo de recuperação automaticamente.
- Após `updateUser` com sucesso: `signOut`, toast e redirect para `/auth`.
- Limpar a URL (`window.history.replaceState`) depois de consumir o token para evitar reprocessamento.

### 3. Melhorar o disparo do reset em `/auth`

Em `src/pages/Auth.tsx`:

- Manter `resetPasswordForEmail` mas garantir `redirectTo` apontando para `${window.location.origin}/redefinir-senha` (já está) e adicionar verificação para usar a URL publicada quando rodando em domínio diferente.
- Mostrar sempre a mesma mensagem genérica de sucesso (já faz isso) — segurança ok.
- Aceitar parâmetro `?recover=1&email=...` na URL para abrir automaticamente o diálogo de recuperação (usado pelo botão "Reenviar" da página de redefinição).
- Adicionar um pequeno aviso na tela de recuperação: "alguns provedores de e-mail podem pré-visualizar o link e invalidá-lo — se não funcionar, peça outro".

### 4. Ação necessária do usuário no painel do Supabase

Para o PKCE e o link funcionarem em todos os ambientes (preview, publicado, custom domain), as URLs abaixo precisam estar listadas em **Authentication → URL Configuration → Redirect URLs**:

```
http://localhost:3000/redefinir-senha
https://id-preview--a17b45fa-a1e2-417c-b1d2-a1a6665f3aa5.lovable.app/redefinir-senha
https://gestor-automacoesbloco.lovable.app/redefinir-senha
```

E o **Site URL** deve ser o domínio principal de produção (`https://gestor-automacoesbloco.lovable.app`). Vou deixar um botão no final da resposta de implementação para você abrir essa tela direto.

## Detalhes técnicos

Arquivos alterados:

- `src/integrations/supabase/client.ts` — adicionar `flowType: 'pkce'` e `detectSessionInUrl: true`.
- `src/pages/RedefinirSenha.tsx` — reescrita: parsing de `code`/hash/erro, validação forte, UX de senha, botão reenviar.
- `src/pages/Auth.tsx` — auto-abrir diálogo de recuperação via query string + aviso sobre scanners de e-mail.

Sem mudanças de banco/edge function — o problema é puramente de fluxo de auth do cliente.

## Fora do escopo

- Customização visual dos e-mails de auth (templates do Supabase) — pode ser feito depois se quiser branding próprio.
- Rate-limit/captcha no reenvio — o Supabase já aplica rate-limit padrão.
