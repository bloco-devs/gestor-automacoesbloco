# Bug encontrado: escalas inconsistentes nos scores do solicitante

## Diagnóstico

Quando o solicitante cria/edita uma solicitação, os três fatores são gravados na **escala 0–10** (slider `min=0 max=10` em `NovaSolicitacao.tsx`, linha 252; `createSolicitacao`/`updateOwnSolicitacao` em `src/lib/supabaseData.ts` gravam direto o valor 0–10).

Porém, em vários pontos da UI os mesmos campos ainda são tratados como se fossem da escala legada (1–4 para frequência, 1–5 para complexidade/retorno). Daí os dois sintomas que você relatou:

### 1. Frequência aparece em branco
`src/pages/SolicitacaoDetail.tsx` (linha 455) e outros pontos fazem:
```ts
FREQUENCIA_LABEL[solicitacao.frequencia]
```
`FREQUENCIA_LABEL` só tem chaves 1–4 (`Eventual`, `Mensal`, `Semanal`, `Diária`). Para qualquer valor da nova escala (0, 5, 6, 7, 8, 9, 10) o lookup retorna `undefined` → célula vazia.

Já existe no projeto um helper pronto para esse caso: `freqLabel(n)` em `src/lib/types.ts` (linha 60), que cai em `"{n}/10"` quando não houver label legado. Ele simplesmente não está sendo usado.

### 2. "6/5" em Complexidade e Retorno
`src/pages/SolicitacaoDetail.tsx` linhas 456–457:
```tsx
<dd>{solicitacao.complexidade}/5</dd>
<dd>{solicitacao.retorno}/5</dd>
```
O "/5" está hard-coded, mas o valor armazenado é 0–10 — por isso aparece "6/5", "8/5" etc.

### 3. Bug correlato: edição do solicitante força a escala antiga
No mesmo arquivo, o `SliderField` usado no modo edição (linhas 804–812) é `min={1} max={5}` para Complexidade e Retorno. Ou seja, se um solicitante editar uma solicitação que tem valor 8, o slider trunca para 5 e regrava — silenciosamente destruindo o valor original. O `NovaSolicitacao` usa 0–10 (linha 252).

### 4. Mesmo lookup quebrado em outras telas
O mesmo padrão `FREQUENCIA_LABEL[...]` (sem fallback) aparece em:
- `src/pages/Kanban.tsx` (linha 214)
- `src/pages/Dashboard.tsx` (linha 218)
- `src/components/minhas-solicitacoes/CardDestaqueLateral.tsx` (linha 45)

Todos sofrem do mesmo "campo em branco" quando a frequência está na escala nova.

## Plano de correção (somente frontend, sem mexer em dados nem em score)

1. **`src/pages/SolicitacaoDetail.tsx`**
   - Trocar `FREQUENCIA_LABEL[solicitacao.frequencia]` por `freqLabel(solicitacao.frequencia)` (linha 455).
   - Trocar `{solicitacao.complexidade}/5` e `{solicitacao.retorno}/5` por `/10` (linhas 456–457).
   - Atualizar o `SliderField` interno (linhas 804–812) para `min={0} max={10}` e label `{value}/10`, alinhando com `NovaSolicitacao`. O `editFrequencia` no Select acima também deve oferecer a escala nova — opção mais simples: trocar o `Select` por um `SliderField` 0–10 igual aos outros, mantendo coerência com a tela de criação.

2. **Demais telas com o mesmo bug de label vazio**
   - `src/pages/Kanban.tsx`: usar `freqLabel(item.frequencia)`.
   - `src/pages/Dashboard.tsx`: usar `freqLabel(s.frequencia)` na linha 218. (A linha 137 itera sobre as 4 chaves legadas como filtro; avaliar se mantém como filtro fixo ou também migra — proponho manter por ora, é um filtro, não exibição de dado salvo.)
   - `src/components/minhas-solicitacoes/CardDestaqueLateral.tsx`: usar `freqLabel(s.frequencia)`.

## Fora do escopo

- Não alterar dados no banco nem mudar a fórmula de score.
- Não tocar na avaliação técnica do dev (`complexidade_dev`), que já usa `/10` corretamente.
- Não mexer no filtro de frequência do Dashboard (linha 137) — é um seletor por categoria legada, comportamento separado da exibição.

Posso aplicar essas correções?
