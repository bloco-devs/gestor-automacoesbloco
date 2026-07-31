BEGIN;

ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS sistema_slug text;

CREATE OR REPLACE FUNCTION public.demand_prefixo_slug(_slug text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF _slug IS NULL OR btrim(_slug) = '' THEN
    RETURN 'REQ';
  END IF;
  s := lower(btrim(_slug));
  IF s ~ '(^|[^a-z])rh([^a-z]|$)' OR s LIKE '%recursos-humanos%' OR s LIKE '%pessoal%' THEN
    RETURN 'RH';
  ELSIF s LIKE '%processo%' OR s LIKE '%sgpo%' THEN
    RETURN 'GP';
  ELSIF s LIKE '%obra%' THEN
    RETURN 'OBR';
  ELSIF s LIKE '%comercial%' OR s LIKE '%crm%' THEN
    RETURN 'COM';
  ELSIF s LIKE '%financ%' THEN
    RETURN 'FIN';
  ELSIF s LIKE '%suprimento%' OR s LIKE '%compras%' THEN
    RETURN 'SUP';
  ELSIF s LIKE '%automac%' OR s LIKE '%automat%' THEN
    RETURN 'AUT';
  END IF;
  RETURN 'REQ';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demand_prefixo_slug(text) FROM PUBLIC, anon;

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

  v_prefixo := public.demand_prefixo_slug(NEW.sistema_slug);
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

COMMIT;