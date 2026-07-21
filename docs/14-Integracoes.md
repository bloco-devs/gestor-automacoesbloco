# Integrações

## Índice
- [HUB Bloco ID](#hub-bloco-id)
- [Supabase](#supabase)
- [Lovable AI Gateway](#lovable-ai-gateway)
- [Importador Trello](#importador-trello)
- [Storage](#storage)
- [Realtime](#realtime)
- [Sienge (somente leitura)](#sienge-somente-leitura)

## HUB Bloco ID
- Ref: `yzuvwhszpyxchlejxsjd`.
- Provê: SSO federado, catálogo de sistemas, roteamento de IA.
- Contrato consumido: `api-gateway/lovable-ai/chat`, `ecossistema-catalogo`.
- Secret `BLOCO_ID_HUB_URL` no painel Supabase.
- Falha do HUB → app entra em fallback (IA direta, mapa via seed).

## Supabase
- Ref: `cgbhpenkytibgiosksrb`.
- Cliente: `src/integrations/supabase/client.ts`.
- Client-side usa apenas anon key.

## Lovable AI Gateway
- Alcançado indiretamente pelo HUB (preferencial) ou diretamente como fallback.
- Modelos padrão: Gemini/GPT via gateway.
- Propaga 429/402 até a UI.

## Importador Trello
- RFC: `docs/rfcs/RFC-001-importador-atividades.md`.
- Adapter versionado (`TRELLO_ADAPTER_VERSION`).
- Snapshot v1.0; runner v1.0.0.
- Formatos aceitos: JSON export do Trello e ZIP com JSON + anexos.

## Storage
- Bucket `atividades-capas` (privado) → URLs assinadas com cache no `sessionStorage`.

## Realtime
- Canal padrão `postgres_changes` por board (`atividades-rt-{boardId}`).
- `REPLICA IDENTITY FULL` garante payload completo em UPDATE/DELETE mesmo com RLS.

## Sienge (somente leitura)
- Chamadas somente GET, quando pertinentes ao mapa/ecossistema.
- Nunca escreve no Sienge — restrição explícita do produto.
