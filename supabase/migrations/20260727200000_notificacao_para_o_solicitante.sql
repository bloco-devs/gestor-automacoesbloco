-- Notificação: o solicitante precisa saber o que acontece com a demanda dele
--
-- DOIS PROBLEMAS, MESMA FUNÇÃO
--
-- 1. O link apontava para /admin/demandas?demand=<id> — rota do fluxo antigo,
--    administrativa, que o solicitante nem tem permissão de abrir. A demanda
--    hoje tem endereço próprio: /demandas/<id>.
--
-- 2. Quando um desenvolvedor assumia a demanda, a única notificação criada ia
--    para o PRÓPRIO desenvolvedor ("você foi designado"). Quem abriu o chamado
--    não recebia nada — ficava sem saber se alguém tinha pegado. Do ponto de
--    vista de quem pediu, esse é o momento mais importante do fluxo: é a
--    primeira prova de que o pedido não caiu num buraco.
--
-- A função é recriada inteira (CREATE OR REPLACE substitui o corpo todo), com
-- os ramos de INSERT e UPDATE preservados na íntegra — mexer só num pedaço
-- apagaria o outro silenciosamente.

CREATE OR REPLACE FUNCTION public.trg_demand_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
BEGIN
  v_link := '/demandas/' || NEW.id::text;

  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> NEW.created_by THEN
      INSERT INTO public.notifications (user_id, title, message, type, link_url)
      VALUES (NEW.assigned_to,
              'Nova demanda atribuída',
              'Você foi designado para: ' || COALESCE(NEW.title, 'Demanda'),
              'assigned',
              v_link);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Nova atribuição (ou troca de responsável)
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       AND NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link_url)
      VALUES (NEW.assigned_to,
              'Demanda atribuída a você',
              'Você foi designado para: ' || COALESCE(NEW.title, 'Demanda'),
              'assigned',
              v_link);

      -- NOVO: avisa também quem abriu a demanda. Sem isso, o solicitante
      -- descreve um problema e nunca descobre que alguém assumiu.
      IF NEW.created_by IS NOT NULL
         AND NEW.created_by IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (NEW.created_by,
                'Alguém assumiu sua demanda',
                COALESCE(NEW.title, 'Sua demanda') || ' já tem responsável.',
                'assigned',
                v_link);
      END IF;
    END IF;

    -- Mudança de status: notifica responsável e criador (se diferentes)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (NEW.assigned_to,
                'Status da demanda atualizado',
                COALESCE(NEW.title, 'Demanda') || ' agora está em ' || NEW.status::text,
                'status_change',
                v_link);
      END IF;
      IF NEW.created_by IS NOT NULL
         AND NEW.created_by IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (NEW.created_by,
                'Sua demanda mudou de status',
                COALESCE(NEW.title, 'Demanda') || ' agora está em ' || NEW.status::text,
                'status_change',
                v_link);
      END IF;
    END IF;

    -- SLA estourado
    IF NEW.sla_status IS DISTINCT FROM OLD.sla_status
       AND NEW.sla_status = 'estourado' THEN
      IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link_url)
        VALUES (NEW.assigned_to,
                'SLA estourado',
                'A demanda "' || COALESCE(NEW.title, '') || '" ultrapassou o SLA.',
                'sla_alert',
                v_link);
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Notificações já gravadas apontam para a rota antiga. Reescrever é seguro:
-- o id é o mesmo, só o caminho muda.
UPDATE public.notifications
SET link_url = '/demandas/' || split_part(link_url, 'demand=', 2)
WHERE link_url LIKE '/admin/demandas?demand=%';
