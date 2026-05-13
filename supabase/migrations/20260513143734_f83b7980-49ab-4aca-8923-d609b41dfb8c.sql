ALTER TABLE public.solicitacoes DROP COLUMN IF EXISTS dificuldade;
UPDATE public.solicitacoes
SET score = round((((frequencia::numeric/4) + (complexidade::numeric/5) + (retorno::numeric/5))/3)*100)::int;