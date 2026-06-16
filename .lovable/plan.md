## Objetivo

Fazer com que o usuário fique logado por até **30 dias** sem precisar passar pela tela `/auth` novamente, mesmo fechando a aba ou o navegador.

## Diagnóstico

O cliente Supabase em `src/integrations/supabase/client.ts` **já está corretamente configurado** com `persistSession: true` + `autoRefreshToken: true` + `storage: localStorage`. Em teoria, a sessão já deveria sobreviver ao fechamento da aba.

Investigando, encontrei **dois pontos** que explicam por que isso não está acontecendo:

### Problema 1 (código) — logout automático em erro transitório

Em `src/hooks/useAuth.tsx`, ao reabrir o app, a função `loadProfile` faz 3 chamadas ao Supabase em paralelo (`profiles`, `get_my_role`, `is_allowed_user`). Se **qualquer uma** falhar — uma instabilidade de rede de 1 segundo, um RPC lento, um 5xx esporádico — o código entra no `catch` e chama `supabase.auth.signOut()`, **apagando a sessão persistida do localStorage**. Resultado: o usuário é jogado de volta para `/auth` mesmo tendo um refresh token válido.

Isso acontece em dois lugares:
- linhas 118-121 (listener `onAuthStateChange`)
- linhas 142-145 (recuperação inicial de sessão)

### Problema 2 (dashboard Supabase) — duração dos tokens

A duração real de uma sessão depende de duas configurações que **só existem no painel do Supabase**, não no código:
- **JWT expiry** (access token) — default 1h
- **Refresh token inactivity timeout** — define por quantos dias um refresh token sem uso continua válido

Para "30 dias sem relogar" é preciso garantir que o inactivity timeout esteja ≥ 30 dias.

## O que vou fazer

### 1. Tornar `loadProfile` tolerante a falhas transitórias

Em `src/hooks/useAuth.tsx`:

- Diferenciar **erro de autorização** ("não está na lista de e-mails permitidos") de **erro técnico** (rede, RPC, etc).
- **Só** chamar `supabase.auth.signOut()` quando for erro de autorização explícito.
- Em erro técnico, manter a sessão, logar no console e tentar de novo (1 retry com pequeno backoff). Se ainda assim falhar, manter o `session` populado mas deixar `user = null` com `loading = false`, e exibir uma mensagem amigável — sem destruir o token.

### 2. Não relogar ao reabrir a aba se a sessão existe

Pequena melhoria no fluxo de inicialização: se `getSession()` retorna uma sessão válida, o usuário continua logado mesmo que `loadProfile` ainda esteja resolvendo. A tela de loading vai aguardar, em vez de redirecionar para `/auth`.

### 3. Instruções para você ajustar o dashboard Supabase (passo manual)

Vou listar os caminhos exatos para você setar 30 dias:

1. Abrir **Authentication → Sign In / Up → Auth Providers** (ou **Settings → Auth**, depende da versão do painel).
2. Localizar **"Refresh token reuse interval"** e **"Inactivity timeout"** (ou "Session inactivity timeout" / "JWT expiry") e configurar:
   - **JWT expiry**: 3600 (1h) — pode manter o default, é renovado em background.
   - **Inactivity timeout**: **2592000** segundos (= 30 dias).
3. Salvar.

Vou colocar o link direto pro painel ao final da implementação para facilitar.

## O que NÃO vou mudar

- `src/integrations/supabase/client.ts` — já está correto.
- Tela `/auth`, `ProtectedRoute`, `RecoveryGuard` — funcionam como esperado; o problema não está neles.
- Fluxo de password recovery — fica intacto.

## Detalhes técnicos

Resumo dos arquivos tocados:

```text
src/hooks/useAuth.tsx
  - loadProfile(): tipar erro de "não autorizado" como classe própria
                   (ex.: throw new NotAllowedError(...)) para o caller distinguir.
  - useEffect inicial:
      catch -> se NotAllowedError: signOut + setUser(null)
               senão: log + setUser(null) SEM signOut (preserva token)
  - listener onAuthStateChange: mesma lógica do catch.
  - Adicionar 1 retry com 500ms de backoff em loadProfile() para
    suavizar falhas de rede momentâneas.
```

Nenhuma migração de banco, nenhuma edge function, nenhuma mudança de schema.

## Resultado esperado

- Fechar a aba/navegador e reabrir → continua logado.
- Ficar até 30 dias sem usar o app → continua logado.
- Após 30 dias sem acesso, ou após `signOut` explícito, ou após o admin remover o e-mail da lista → cai em `/auth`.
