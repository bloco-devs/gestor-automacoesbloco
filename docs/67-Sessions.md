# 67 — Session Center

Rota: `/admin/sessions`.

Visão local da sessão ativa do usuário no navegador atual:
- E-mail e papel do usuário
- Browser e sistema operacional detectados via `navigator.userAgent`
- IP mascarado (nunca exibimos IPs reais no frontend)

Logout remoto e timeout continuam sendo geridos pelo Supabase Auth — sem alteração de backend nesta feature.
