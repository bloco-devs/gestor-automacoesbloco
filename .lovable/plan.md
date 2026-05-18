## Diagnóstico

Ao tentar entrar, `useAuth.loadProfile` faz 3 chamadas em paralelo:
- `profiles` (SELECT) — **200 OK**
- `rpc.get_my_role` — **200 OK** (retorna `"developer"`)
- `rpc.is_allowed_user` — **403 "permission denied for function is_allowed_user"**

Como `allowedErr` fica setado, o código lança `"Não foi possível verificar suas permissões. Tente novamente."` e força `signOut()`. Por isso o login parece "passar" no Supabase (token é gerado) mas o app desloga em seguida.

### Causa raiz

Existem duas funções homônimas:
- `private.is_allowed_user()` — usada nas RLS policies, com `EXECUTE` para `authenticated` (ok).
- `public.is_allowed_user()` — exposta via PostgREST/RPC, **sem** `EXECUTE` para `authenticated` (nem `anon`).

Confirmação via inspeção de privilégios:

```text
nspname  | proname           | auth_exec | anon_exec
---------+-------------------+-----------+-----------
private  | is_allowed_user   | true      | true
public   | is_allowed_user   | false     | false   <-- chamada pelo cliente
public   | get_my_role       | true      | false
public   | admin_list_accounts| true     | false
```

A migration recente que criou `get_my_role`/`admin_list_accounts` concedeu `EXECUTE` nelas, mas a `public.is_allowed_user` ficou sem grant (provavelmente um `REVOKE ALL ... FROM PUBLIC` aplicado por trigger/diretriz de segurança sem `GRANT` subsequente para `authenticated`).

`public.has_role` também está sem grant, mas não é chamada do cliente, então não causa erro agora.

## Correção proposta

### Opção A (recomendada) — Conceder EXECUTE na função existente

Migration:
```sql
GRANT EXECUTE ON FUNCTION public.is_allowed_user() TO authenticated;
```

Vantagens: 1 linha, restabelece o comportamento esperado, mantém a arquitetura atual (RPC `is_allowed_user` continua sendo a fonte de verdade no cliente).

### Opção B — Eliminar a chamada do cliente

Refatorar `useAuth.loadProfile` para derivar autorização de `get_my_role` (já chamada e funcionando), e ajustar `public.get_my_role` para retornar `NULL` quando o e-mail não está em `allowed_emails` (hoje cai no fallback `'requester'`, o que torna a função inútil para autorização).

Mudanças:
- Migration alterando `get_my_role` para `SELECT ae.role FROM ...` sem o `COALESCE('requester')`.
- `useAuth`: remover `supabase.rpc("is_allowed_user")`; se `roleStr` for `null`, tratar como não autorizado.

Mais robusta a longo prazo (menos round-trips, menos funções públicas), mas mexe em mais código.

### Recomendação

Aplicar **Opção A agora** para destravar o login (1 migration de uma linha) e considerar a Opção B como refatoração futura junto com a Fase 3/Auditoria.

## Verificação após o fix

1. Recarregar `/auth` e logar com `blococcomercial@gmail.com`.
2. No Network: `rpc/is_allowed_user` deve retornar `200` com body `true`.
3. Redirecionar para `/dashboard` (papel `developer`).
4. Confirmar que `/configuracoes` segue acessível.

## Arquivos afetados

- Nova migration SQL (1 linha de `GRANT`).
- Nenhum arquivo de código alterado na Opção A.
