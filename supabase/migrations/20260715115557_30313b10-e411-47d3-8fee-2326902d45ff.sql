CREATE OR REPLACE FUNCTION public.auto_conclude_on_coluna_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_chave text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.coluna_id IS DISTINCT FROM OLD.coluna_id THEN
    SELECT chave INTO v_chave FROM public.atividades_colunas WHERE id = NEW.coluna_id;
    IF v_chave = 'concluido' OR v_chave LIKE 'concluido-%' THEN
      IF NEW.concluido = false THEN
        NEW.concluido := true;
        NEW.data_conclusao := now();
      END IF;
    ELSIF (v_chave IS DISTINCT FROM 'concluido' AND v_chave NOT LIKE 'concluido-%')
          AND NEW.concluido = true AND OLD.concluido = true THEN
      -- reabre se saiu da coluna concluido
      NEW.concluido := false;
      NEW.data_conclusao := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;