ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS ticket_code text;

CREATE OR REPLACE FUNCTION public.demand_prefixo(_system_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  IF _system_id IS NULL THEN
    RETURN 'REQ';
  END IF;
  SELECT lower(translate(coalesce(nome,''), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    INTO v_nome
    FROM public.solucoes WHERE id = _system_id;
  IF v_nome IS NULL THEN
    RETURN 'REQ';
  END IF;
  IF v_nome ~ '(^|[^a-z])rh([^a-z]|$)' OR v_nome LIKE '%recursos humanos%' OR v_nome LIKE '%departamento pessoal%' THEN
    RETURN 'RH';
  ELSIF v_nome LIKE '%processo%' OR v_nome LIKE '%sgpo%' THEN
    RETURN 'GP';
  ELSIF v_nome LIKE '%obra%' THEN
    RETURN 'OBR';
  END IF;
  RETURN 'REQ';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demand_prefixo(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.demands_set_ticket_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefixo text;
  v_aamm text;
  v_seq int;
BEGIN
  IF NEW.ticket_code IS NOT NULL AND NEW.ticket_code <> '' THEN
    RETURN NEW;
  END IF;

  v_prefixo := public.demand_prefixo(NEW.system_id);
  v_aamm := to_char(COALESCE(NEW.created_at, now()), 'YYMM');

  PERFORM pg_advisory_xact_lock(hashtext('demand_ticket_code:' || v_prefixo || v_aamm));

  SELECT COALESCE(MAX(substring(ticket_code from '([0-9]{4})$')::int), 0) + 1
    INTO v_seq
    FROM public.demands
   WHERE ticket_code LIKE v_prefixo || '-' || v_aamm || '-%';

  NEW.ticket_code := v_prefixo || '-' || v_aamm || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demands_set_ticket_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_demands_ticket_code ON public.demands;
CREATE TRIGGER trg_demands_ticket_code
BEFORE INSERT ON public.demands
FOR EACH ROW EXECUTE FUNCTION public.demands_set_ticket_code();

WITH legado AS (
  SELECT id,
         'LEG-' || to_char(created_at, 'YYMM') || '-' ||
         lpad(row_number() OVER (PARTITION BY to_char(created_at, 'YYMM') ORDER BY created_at, id)::text, 4, '0') AS code
    FROM public.demands
   WHERE ticket_code IS NULL
)
UPDATE public.demands d
   SET ticket_code = l.code
  FROM legado l
 WHERE d.id = l.id;

CREATE UNIQUE INDEX IF NOT EXISTS demands_ticket_code_key ON public.demands (ticket_code);

ALTER TABLE public.demands ALTER COLUMN ticket_code SET NOT NULL;