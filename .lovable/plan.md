## Publicar ajuste da sidebar mobile

Publicar a versão atual para colocar no ar o drawer mobile do `AppLayout.tsx` (botão hambúrguer + overlay com backdrop, fecha ao navegar).

### Pré-checagem antes do publish
- Confirmar metadados do `index.html` (title, meta description, OG/Twitter, favicon) — ajustar se ainda estiverem genéricos.
- Rodar scan de segurança e verificar findings críticos pendentes; se houver, reportar antes de publicar.

### Publicação
- Chamar `preview_ui--publish` com o resumo dos metadados verificados.
- Informar a URL (`https://gestor-automacoesbloco.lovable.app`) e que a propagação leva ~1 minuto.

Sem mudanças de código nesta etapa — apenas deploy do que já está commitado.