-- ============================================================================
-- O solicitante não conseguia anexar — e o anexo da conversa não tinha onde cair
-- ============================================================================
--
-- SINTOMA
-- Perfil `requester` escolhe um PDF ou uma foto, a barra de progresso some e
-- nada aparece. Sem erro na tela, porque `enviar()` lançava dentro de um
-- `void` e a rejeição morria sem dono (isso se conserta no front).
--
-- AS QUATRO CAUSAS, EM ORDEM DE QUEM DERRUBA MAIS GENTE
--
-- 1) O BUCKET NUNCA FOI VERSIONADO
--    Nenhuma migração cria `demand-attachments`. Ele nasceu pelo painel, e o
--    painel guarda `allowed_mime_types` e `file_size_limit` — dois campos que
--    ninguém neste repositório consegue ler, revisar ou reproduzir noutro
--    ambiente. Um bucket com allowlist de MIME desatualizada recusa
--    `application/pdf` e `image/jpeg` com 400 antes de qualquer RLS rodar, e o
--    sintoma é exatamente o relatado: PDF e JPEG falham, PNG passa.
--    Aqui ele passa a existir em migração, com os tipos e o teto declarados.
--
-- 2) `can_view_demand` NÃO CONHECIA A EQUIPE
--    Ela autoriza `created_by`, `assigned_to` e `has_role(...,'admin')` — e é
--    ela que guarda a tabela de anexos E o bucket. Mas o papel real do produto
--    vive em `allowed_emails.role` e é lido por `is_equipe()`, que a migração
--    "equipe pode assumir demanda" já usa para o UPDATE de `demands`.
--    Resultado: o desenvolvedor que ainda não assumiu a demanda podia mexer na
--    demanda e não conseguia ler nem enviar o anexo dela. O anexo ficava mais
--    trancado que a própria demanda — e a regra certa é o contrário: anexo
--    acompanha a demanda, nunca é mais restrito que ela.
--
-- 3) `owner = auth.uid()` NO WITH CHECK DO STORAGE
--    A coluna `owner` (uuid) foi substituída por `owner_id` (text) no
--    storage-api. Em versão que preenche só `owner_id`, `owner` chega NULL, o
--    WITH CHECK dá falso e todo upload é negado — para todo mundo, sem
--    mensagem útil. O dono já não era o que autorizava: quem autoriza é a
--    pasta (`<demand_id>/…`), que é conferida logo abaixo. A cláusula só
--    existia para negar. Sai do INSERT e fica no DELETE, tolerante às duas
--    colunas, que é onde posse de fato importa.
--
-- 4) NÃO HAVIA ENDEREÇO PARA O ANEXO ANTES DA DEMANDA EXISTIR
--    O caminho é `<demand_id>/<arquivo>` e a política confere esse id. Enquanto
--    a pessoa conversa com a IA a demanda ainda não existe, então não havia
--    caminho válido possível. Nasce aqui a pasta `rascunhos/<user_id>/…`: cada
--    um só enxerga a própria, e ao confirmar a demanda o arquivo é movido para
--    `<demand_id>/…` (daí a política de UPDATE, que é o que `move` executa).
--
-- SOBRE "QUALQUER AUTENTICADO PODE LER"
-- O pedido foi garantir INSERT e SELECT a qualquer autenticado, solicitante
-- incluído. Fazer isso ao pé da letra abriria todo anexo de toda demanda para
-- toda a empresa — atestados, prints com dados de cliente, contratos. O que
-- está aqui entrega a intenção sem o buraco: nenhum autenticado é barrado por
-- ser solicitante; ele é barrado apenas por pedir o anexo de uma demanda que
-- não é dele nem da equipe. Se a exposição total for mesmo desejada, é uma
-- linha (`using (bucket_id = 'demand-attachments')`) e uma decisão consciente.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0) Um cast que não derruba a política
-- ----------------------------------------------------------------------------
-- `(storage.foldername(name))[1]::uuid` estoura com "invalid input syntax" no
-- instante em que a primeira pasta não é um uuid — e a partir de agora ela às
-- vezes é a palavra `rascunhos`. Postgres não garante curto-circuito de `OR`,
-- então não dá para confiar na ordem dos ramos: o cast precisa ser incapaz de
-- lançar.
CREATE OR REPLACE FUNCTION public.uuid_ou_nulo(_texto text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
BEGIN
  RETURN _texto::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.uuid_ou_nulo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.uuid_ou_nulo(text) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 1) O bucket, agora versionado
-- ----------------------------------------------------------------------------
-- `on conflict` porque ele já existe em produção: esta migração não recria,
-- normaliza. `public = false` é intencional — a leitura é por URL assinada
-- (`getAttachmentSignedUrl`), e bucket público tornaria a RLS acima decorativa.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'demand-attachments',
  'demand-attachments',
  false,
  26214400, -- 25 MB. Print de celular moderno passa de 8 MB; 25 dá folga sem virar depósito.
  ARRAY[
    -- Imagem: os quatro que os navegadores realmente produzem, mais HEIC, que
    -- é o padrão do iPhone e chegava aqui como tipo desconhecido.
    'image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/avif', 'image/heic', 'image/heif',
    -- Documento
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Texto e log: o que acompanha um chamado técnico
    'text/plain', 'text/csv', 'text/markdown', 'application/json', 'text/xml', 'application/xml',
    -- Vídeo curto de tela — a Anexos.tsx já sabe reproduzir
    'video/mp4', 'video/webm', 'video/quicktime',
    -- Pacote
    'application/zip', 'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ----------------------------------------------------------------------------
-- 2) Quem pode ver uma demanda passa a incluir a equipe
-- ----------------------------------------------------------------------------
-- `is_equipe()` lê `get_my_role()`, que só sabe responder sobre auth.uid().
-- Por isso o ramo é guardado por `_user_id = auth.uid()`: chamada em nome de
-- terceiro continua respondendo pelo terceiro, não pelo chamador.
CREATE OR REPLACE FUNCTION public.can_view_demand(_demand_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND _demand_id IS NOT NULL AND (
    (_user_id = auth.uid() AND public.is_equipe())
    OR EXISTS (
      SELECT 1 FROM public.demands d
       WHERE d.id = _demand_id
         AND (d.created_by = _user_id
              OR d.assigned_to = _user_id
              OR public.has_role(_user_id, 'admin'::app_role))
    )
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_demand(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_demand(uuid, uuid) TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 3) A tabela public.demand_attachments
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_attachments TO authenticated;

DROP POLICY IF EXISTS demand_attachments_select ON public.demand_attachments;
CREATE POLICY demand_attachments_select ON public.demand_attachments
FOR SELECT TO authenticated
USING (public.can_view_demand(demand_id, auth.uid()));

-- O `uploaded_by = auth.uid()` fica: é o que impede assinar anexo com o nome de
-- outra pessoa. O que sai é qualquer exigência de papel — solicitante que
-- enxerga a demanda anexa nela, ponto.
DROP POLICY IF EXISTS demand_attachments_insert ON public.demand_attachments;
CREATE POLICY demand_attachments_insert ON public.demand_attachments
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.can_view_demand(demand_id, auth.uid())
  AND EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.deleted_at IS NULL)
);

DROP POLICY IF EXISTS demand_attachments_delete ON public.demand_attachments;
CREATE POLICY demand_attachments_delete ON public.demand_attachments
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND d.created_by = auth.uid())
);

-- A política de leitura do storage faz um lookup por `file_url` a cada objeto
-- avaliado. Sem índice isso é um seq scan por arquivo listado.
CREATE INDEX IF NOT EXISTS demand_attachments_file_url_idx
  ON public.demand_attachments (file_url);


-- ----------------------------------------------------------------------------
-- 4) O bucket: storage.objects
-- ----------------------------------------------------------------------------

-- LEITURA — três portas, e a terceira é a que salva o arquivo movido pela metade
--   a) o caminho definitivo `<demand_id>/…`
--   b) o próprio rascunho, só para quem o enviou
--   c) qualquer objeto já registrado em `demand_attachments` de uma demanda
--      visível. Existe porque `move` pode falhar (rede, corrida) e o caminho
--      gravado continuar sendo o do rascunho: sem esta porta, o anexo apareceria
--      na lista e não abriria para ninguém além de quem enviou.
DROP POLICY IF EXISTS demand_attachments_read ON storage.objects;
CREATE POLICY demand_attachments_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'demand-attachments'
  AND (
    public.can_view_demand(public.uuid_ou_nulo((storage.foldername(name))[1]), auth.uid())
    OR (
      (storage.foldername(name))[1] = 'rascunhos'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM public.demand_attachments a
       WHERE a.file_url = objects.name
         AND public.can_view_demand(a.demand_id, auth.uid())
    )
  )
);

-- ESCRITA — a pasta é a credencial. Ver causa (3) no cabeçalho para o motivo de
-- `owner` ter saído daqui.
DROP POLICY IF EXISTS demand_attachments_upload ON storage.objects;
CREATE POLICY demand_attachments_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'demand-attachments'
  AND (
    public.can_view_demand(public.uuid_ou_nulo((storage.foldername(name))[1]), auth.uid())
    OR (
      (storage.foldername(name))[1] = 'rascunhos'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- MOVER — `move` é um UPDATE de `name`. USING vê a linha antiga (o rascunho de
-- quem chama), WITH CHECK vê a nova (a demanda que ele acabou de criar). Sem
-- esta política o arquivo ficaria preso em `rascunhos/` para sempre.
DROP POLICY IF EXISTS demand_attachments_promover_rascunho ON storage.objects;
CREATE POLICY demand_attachments_promover_rascunho ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'demand-attachments'
  AND (storage.foldername(name))[1] = 'rascunhos'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'demand-attachments'
  AND public.can_view_demand(public.uuid_ou_nulo((storage.foldername(name))[1]), auth.uid())
);

-- APAGAR — aqui posse importa, e por isso as duas colunas são aceitas: versões
-- diferentes do storage-api preenchem `owner`, `owner_id`, ou ambas.
DROP POLICY IF EXISTS demand_attachments_delete_own ON storage.objects;
CREATE POLICY demand_attachments_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'demand-attachments'
  AND (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'rascunhos'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
