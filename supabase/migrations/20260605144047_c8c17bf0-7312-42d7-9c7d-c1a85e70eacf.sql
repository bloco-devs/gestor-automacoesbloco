
ALTER TABLE public.atividades_cards
  ADD COLUMN IF NOT EXISTS responsavel_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Backfill: migrate single responsavel_id into the array
UPDATE public.atividades_cards
SET responsavel_ids = ARRAY[responsavel_id]
WHERE responsavel_id IS NOT NULL
  AND (responsavel_ids IS NULL OR array_length(responsavel_ids, 1) IS NULL);
