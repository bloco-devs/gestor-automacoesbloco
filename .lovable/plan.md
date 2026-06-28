## Corrigir finding crítico de storage e publicar

### Problema
As 4 policies de `storage.objects` para o bucket `plataforma-icones` chamam `is_allowed_user()` sem schema. O scanner exige `public.is_allowed_user()` para evitar manipulação de `search_path`.

### Mudança (cirúrgica, sem tocar em auth/SSO)
Migration que apenas recria as 4 policies do bucket `plataforma-icones` em `storage.objects`, trocando `is_allowed_user()` por `public.is_allowed_user()`. Não altera:
- a função `public.is_allowed_user()` em si (continua igual, lendo de `allowed_emails` via `auth.uid()`);
- nenhuma policy de tabelas `public.*`;
- nada em `auth.*`, edge functions, triggers de SSO, `handle_new_user`, ou `allowed_emails`.

Estrutura da migration:
```sql
DROP POLICY IF EXISTS "<nome_select>" ON storage.objects;
DROP POLICY IF EXISTS "<nome_insert>" ON storage.objects;
DROP POLICY IF EXISTS "<nome_update>" ON storage.objects;
DROP POLICY IF EXISTS "<nome_delete>" ON storage.objects;

CREATE POLICY ... ON storage.objects FOR SELECT
  USING (bucket_id = 'plataforma-icones' AND public.is_allowed_user());
-- idem INSERT/UPDATE/DELETE com WITH CHECK quando aplicável
```
Os nomes exatos das 4 policies serão lidos antes via `supabase--read_query` em `pg_policies` para preservar nomes e cláusulas originais (só schema-qualifying a função).

### Risco para o SSO
Nenhum. A função, os triggers de criação de usuário (`handle_new_user`), o callback SSO e as edge functions ficam intactos. O ajuste é só em policies do bucket de ícones (upload/leitura de ícones da plataforma). Pior caso isolado: se algo der errado, o efeito é só não conseguir ler/gravar ícones do bucket — login e app continuam funcionando.

### Validação antes de publicar
1. `vitest run` (deve continuar 34/34 verde — não há cobertura de storage policies, mas garante que nada de frontend regrediu).
2. `security--run_security_scan` para confirmar que o crítico sumiu.
3. `preview_ui--publish` com metadados já validados (title/description/OG/Twitter/favicon do `index.html` estão ok).

### Findings de warn (não bloqueantes)
Permanecem os warns (`has_role` sem schema em 9 policies, leaked password protection, security definer executável). Não estão no escopo desta publicação — posso tratar depois se quiser.