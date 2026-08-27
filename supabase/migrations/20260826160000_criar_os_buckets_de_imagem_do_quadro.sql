-- ===========================================================================
-- OS BUCKETS DE IMAGEM DO QUADRO NUNCA FORAM CRIADOS
-- ===========================================================================
--
-- O SINTOMA
--
-- "ainda não consegui adicionar foto de fundo dentro dos quadros." O botão
-- aparece, o arquivo é escolhido, e volta "Falha ao enviar imagem de fundo".
--
-- A CAUSA — e ela é do tipo que passa despercebida por muito tempo
--
-- O projeto tem POLÍTICAS para três buckets de storage:
--
--   atividades-capas     → 4 policies (ler, enviar, atualizar, excluir)
--   boards-backgrounds   → policies
--   boards_icons         → policies
--
-- E NENHUM deles é criado por migration. A única `INSERT INTO storage.buckets`
-- do projeto inteiro é a de `demand-attachments`.
--
-- Ou seja: as regras de quem pode gravar existem, mas o lugar onde gravar não.
-- Enviar para um bucket inexistente devolve "Bucket not found", que o
-- `catch` da tela traduz para a mensagem genérica de falha — e a mensagem
-- genérica é o que fez isso parecer problema de permissão por dois dias.
--
-- Por que ninguém percebeu antes: política em bucket que não existe não dá
-- erro. Ela é criada, fica válida, e simplesmente nunca casa com nada. O
-- `CREATE POLICY` passa, a migration passa, e o defeito só aparece quando
-- alguém tenta enviar um arquivo.
--
-- POR QUE PRIVADOS
--
-- O código lê as três imagens por `createSignedUrl` — nunca por
-- `getPublicUrl`. Bucket público tornaria as quatro policies decorativas: o
-- arquivo estaria acessível por URL direta a quem tivesse o link, e a regra
-- de "só admin do quadro" valeria só para gravar. Mantendo privado, a policy
-- de leitura (`is_allowed_user`) continua sendo a porta.
-- ===========================================================================

/**
 * `ON CONFLICT DO NOTHING` porque um deles pode ter sido criado à mão pelo
 * painel do Supabase em algum momento. Esta migration cria o que falta e não
 * mexe no que existe — reconfigurar um bucket em uso poderia recusar arquivos
 * que hoje passam.
 *
 * Limite de 6 MB com a aplicação validando em 5: a mensagem amigável
 * ("Imagem excede 5 MB") é a que a pessoa deve ver. O limite do bucket é
 * rede de segurança para quem chamar a API por fora, não o validador
 * principal — se os dois fossem 5 MB exatos, um arquivo no limite viraria
 * erro cru do storage em vez do aviso da tela.
 */
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'atividades-capas',
    'atividades-capas',
    false,
    6291456, -- 6 MB
    ARRAY['image/jpeg','image/pjpeg','image/png','image/gif','image/webp','image/avif']
  ),
  (
    'boards-backgrounds',
    'boards-backgrounds',
    false,
    6291456,
    ARRAY['image/jpeg','image/pjpeg','image/png','image/gif','image/webp','image/avif']
  ),
  (
    'boards_icons',
    'boards_icons',
    false,
    6291456,
    ARRAY['image/jpeg','image/pjpeg','image/png','image/gif','image/webp','image/avif','image/svg+xml']
  )
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- Uma linha por bucket que o código usa, dizendo se ele existe e quantas
-- políticas apontam para ele. `existe = false` com `policies > 0` é
-- exatamente o estado que causou o defeito: regra sem lugar para valer.

SELECT
  t.bucket,
  (b.id IS NOT NULL)                      AS existe,
  b.public                                AS publico,
  b.file_size_limit                       AS limite_bytes,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'storage'
      AND p.tablename  = 'objects'
      AND p.qual::text || coalesce(p.with_check::text,'') LIKE '%' || t.bucket || '%')
                                          AS policies
FROM (VALUES
  ('atividades-capas'),
  ('boards-backgrounds'),
  ('boards_icons'),
  ('demand-attachments')
) t(bucket)
LEFT JOIN storage.buckets b ON b.id = t.bucket
ORDER BY existe, t.bucket;
