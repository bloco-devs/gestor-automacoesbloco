## Objetivo

Adicionar um mini assistente de IA na página **Nova Demanda** que ajuda o solicitante a escrever uma descrição mais completa e detalhada da sua demanda, através de 3-4 perguntas dinâmicas. Ao final, o assistente preenche **apenas o campo "Descrição da atividade atual"** — todos os outros campos (título, softwares, setor, critérios) continuam sendo preenchidos manualmente pelo usuário.

## Fluxo do usuário

1. Na página `/nova-demanda`, ao lado/acima do campo "Descrição da atividade atual" aparece um botão **"✨ Descrever com ajuda da IA"**.
2. Ao clicar, abre um **Dialog** com um chat simples.
3. A IA inicia perguntando algo como: *"Em poucas palavras, qual atividade ou processo você gostaria de automatizar?"*
4. O usuário responde. A IA analisa a resposta e faz a próxima pergunta dinamicamente (contexto, ferramentas usadas hoje, dor principal, resultado esperado, etc.).
5. Após **3 a 4 perguntas**, a IA mostra um botão **"Gerar descrição"**.
6. Ao clicar, a IA consolida tudo em uma descrição estruturada e bem escrita.
7. Usuário vê preview da descrição com botões **"Usar esta descrição"** (preenche o textarea e fecha o dialog) ou **"Refazer"**.

## Arquitetura técnica

### Backend — Edge Function `assistente-demanda`

Nova função em `supabase/functions/assistente-demanda/index.ts` que usa **Lovable AI Gateway** (`google/gemini-3-flash-preview`).

Dois modos de operação controlados por um campo `action` no body:

- `action: "next_question"` — recebe o histórico de mensagens, retorna a próxima pergunta. A IA decide quando já tem informação suficiente e responde com `{ done: true }` (depois da 3ª/4ª pergunta).
- `action: "generate_description"` — recebe o histórico completo, retorna a descrição final consolidada (texto corrido, 1-2 parágrafos).

System prompt instrui a IA a:
- Fazer perguntas curtas, em português, uma de cada vez.
- Cobrir: o que é feito hoje, com qual frequência/contexto, qual a dor principal, qual o resultado esperado.
- Limite máximo de 4 perguntas.
- Na geração final, escrever em primeira pessoa do solicitante, de forma objetiva.

Tratamento de erros 429 (rate limit) e 402 (créditos) com mensagens claras retornadas ao cliente.

`verify_jwt = true` (usuário autenticado).

### Frontend

Novo componente `src/components/AssistenteDescricao.tsx`:
- `Dialog` do shadcn com chat (lista de mensagens user/assistant + input).
- Estado local: `messages`, `loading`, `phase: "chatting" | "preview"`, `draft`.
- Chama edge function via `supabase.functions.invoke("assistente-demanda", ...)`.
- Props: `onAccept(descricao: string)` para devolver o texto ao formulário.

Mudança em `src/pages/NovaDemanda.tsx`:
- Botão "✨ Descrever com ajuda da IA" acima do `<Textarea>` da descrição.
- Ao aceitar, faz `setDescricao(textoGerado)`.

## Layout do Dialog

```text
┌─ Assistente de demanda ────────────────┐
│ 🤖 Em poucas palavras, qual atividade  │
│    você gostaria de automatizar?       │
│                                        │
│              Gero relatórios diários…🧑│
│                                        │
│ 🤖 Quanto tempo isso costuma levar?    │
│ ┌────────────────────────────────────┐ │
│ │ digite sua resposta…       [Enviar]│ │
│ └────────────────────────────────────┘ │
│                          [Gerar descrição] (aparece após N perguntas)
└────────────────────────────────────────┘
```

Na fase preview:
```text
┌─ Pré-visualização ─────────────────────┐
│ "Atualmente gero manualmente…"         │
│             [Refazer]  [Usar descrição]│
└────────────────────────────────────────┘
```

## Arquivos afetados

- `supabase/functions/assistente-demanda/index.ts` (novo)
- `src/components/AssistenteDescricao.tsx` (novo)
- `src/pages/NovaDemanda.tsx` (botão + integração)

## Fora do escopo

- Preencher outros campos do formulário (título, setor, softwares, critérios).
- Persistir as conversas do assistente.
- Streaming token-a-token (resposta única por pergunta é suficiente para o caso).
- Disponibilizar o assistente para o desenvolvedor (apenas solicitante).
