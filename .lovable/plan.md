# Aplicar a migração de RLS dos anexos no banco de produção

## O que já verifiquei no banco real

- A migração `20260814120000_anexos_do_solicitante_e_do_rascunho.sql` **já está no código** (commit `93a8f96`), ou seja, a sincronização com o GitHub já aconteceu — não há nada a puxar.
- Ela **não foi aplicada** no banco:
  - `public.uuid_ou_nulo` não existe;
  - `public.can_view_demand` ainda não conhece a equipe (`is_equipe` ausente na definição);
  - em `storage.objects` existem só 3 políticas antigas (`read`, `upload`, `delete_own`) — falta a de UPDATE (`promover_rascunho`), que é a que permite mover o anexo de `rascunhos/<user>/` para `<demand_id>/`.
- O bucket `demand-attachments` existe, é privado, e está com `allowed_mime_types = NULL` e `file_size_limit = NULL` — isto é, **hoje não há allowlist bloqueando PDF/JPEG**. A recusa vinha das políticas, não do MIME.

## Sobre o erro do `supabase db push`

O histórico remoto tem versões que não existem na pasta local (migrações criadas pelo painel/Lovable). Não vou mexer nisso pelo CLI: aplico a migração diretamente no banco pela ferramenta de migração da plataforma, que registra a versão no histórico remoto e não exige que os dois lados coincidam. O `db push` local passa a funcionar depois com `supabase migration repair` — mas isso é opcional e não bloqueia o teste.

## O que será aplicado

Uma migração com o conteúdo do arquivo, com **um ajuste**: o bloco `INSERT INTO storage.buckets` é removido. Escrita em `storage.buckets` é bloqueada pela plataforma e, como os limites hoje são nulos (nada bloqueado), a remoção não altera o comportamento de PDF/JPEG. Se quiser depois travar tipos e teto de 25 MB, faço em passo separado.

O restante vai integral:

1. `public.uuid_ou_nulo(text)` — cast que não estoura quando a primeira pasta é `rascunhos`.
2. `public.can_view_demand` — passa a autorizar a equipe via `is_equipe()`, além de criador/responsável/admin.
3. `public.demand_attachments` — grants + políticas de SELECT/INSERT/DELETE sem exigência de papel, e índice em `file_url`.
4. `storage.objects` — recria `read`, `upload`, `delete_own` (sem o `owner = auth.uid()` no WITH CHECK, que negava todo upload) e **cria** `promover_rascunho` (UPDATE), habilitando a pasta de rascunho antes da demanda existir.

## Verificação depois de aplicar

Consulto o banco para confirmar: `uuid_ou_nulo` existe, `can_view_demand` contém `is_equipe`, e as 4 políticas de `storage.objects` estão presentes. Aviso você quando isso estiver confirmado, para testar o envio de anexo com perfil de solicitante.

## Fora de escopo

Nenhuma alteração de front-end nesta fatia. A Edge Function `assistente-demanda` já foi publicada pelo Claude.
