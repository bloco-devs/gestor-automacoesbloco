-- A rotina de boas-vindas é um gatilho: o banco a executa por conta própria
-- quando uma demanda nasce. Ninguém precisa chamá-la, e por ser SECURITY
-- DEFINER ela escreve com privilégios elevados — deixá-la aberta ao público
-- seria oferecer uma porta de escrita sem dono.
REVOKE ALL ON FUNCTION public.demands_mensagem_de_boas_vindas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.demands_mensagem_de_boas_vindas() FROM anon;
REVOKE ALL ON FUNCTION public.demands_mensagem_de_boas_vindas() FROM authenticated;