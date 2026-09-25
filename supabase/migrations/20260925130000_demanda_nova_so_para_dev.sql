-- Demanda nova sem responsável vai só para quem desenvolve
--
-- Em 20260925120000 o aviso de "chegou demanda sem responsável" ia para toda a
-- equipe: `developer` e `administrador`, a mesma regra de is_equipe(). Decisão
-- do produto: administrador acompanha as demandas, mas não é quem assume — o
-- aviso para ele seria ruído. Agora vai só para `developer`.
--
-- O QUE NÃO MUDA: a regra de nota interna em trg_notificacao_whatsapp continua
-- usando eh_da_equipe(), que inclui administrador. Ali a pergunta é outra —
-- quem pode ver o que a equipe escreve entre si —, e um administrador que
-- participa de uma demanda continua recebendo as notas internas dela.
--
-- Só a função é redefinida; o trigger que a chama continua o mesmo.
-- Sem literal acentuado: aplicada pelo SQL Editor do Supabase.

CREATE OR REPLACE FUNCTION public.trg_demanda_whatsapp_equipe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitante text;
  v_sol_email   text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.nome, p.email INTO v_solicitante, v_sol_email
  FROM public.profiles p WHERE p.id = NEW.created_by;

  INSERT INTO public.notificacao_whatsapp_fila
    (destinatario_id, telefone, demanda_id, evento, dados)
  SELECT
    pref.user_id,
    pref.whatsapp_telefone,
    NEW.id,
    'dev_demanda_nova',
    -- Sem a chave 'status', de proposito: o filtro de repeticao do aviso ao
    -- solicitante compara dados->>'status', e esta linha nao pode segurar
    -- um aviso dele.
    jsonb_build_object(
      'ticket_code', NEW.ticket_code,
      'titulo',      NEW.title,
      'nome',        split_part(
                       COALESCE(NULLIF(btrim(prof.nome), ''),
                                split_part(COALESCE(prof.email, ''), '@', 1)),
                       ' ', 1),
      'solicitante', split_part(
                       COALESCE(NULLIF(btrim(v_solicitante), ''),
                                split_part(COALESCE(v_sol_email, ''), '@', 1)),
                       ' ', 1),
      'prioridade',  NEW.priority::text,
      'descricao',   left(COALESCE(NEW.description, ''), 400)
    )
  FROM public.notificacao_preferencias pref
  JOIN auth.users u          ON u.id = pref.user_id
  JOIN public.allowed_emails ae ON ae.email = lower(u.email)
  LEFT JOIN public.profiles prof ON prof.id = pref.user_id
  WHERE pref.whatsapp_ativo
    AND pref.whatsapp_telefone IS NOT NULL
    AND ae.role = 'developer'
    AND pref.user_id IS DISTINCT FROM NEW.created_by;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_demanda_whatsapp_equipe: aviso nao enfileirado para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
