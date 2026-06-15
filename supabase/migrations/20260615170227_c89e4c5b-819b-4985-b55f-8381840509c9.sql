ALTER TABLE public.atividades_cards
  ADD COLUMN IF NOT EXISTS responsavel_persona_ids uuid[] NOT NULL DEFAULT '{}';

INSERT INTO public.atividades_personas (user_id, nome, ativo)
SELECT u.id, x.nome, true
FROM auth.users u
CROSS JOIN (VALUES ('Nielson'), ('André')) AS x(nome)
WHERE lower(u.email) = 'tecnologiabloco@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.atividades_personas p
    WHERE p.user_id = u.id AND p.nome = x.nome
  );