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
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       AND NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link_url)
      VALUES (NEW.assigned_to,
              'Demanda atribuída a você',
              'Você foi designado para: ' || COALESCE(NEW.title, 'Demanda'),
              'assigned',
              v_link);

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

UPDATE public.notifications
SET link_url = '/demandas/' || split_part(link_url, 'demand=', 2)
WHERE link_url LIKE '/admin/demandas?demand=%';