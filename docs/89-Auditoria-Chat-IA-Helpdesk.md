# Auditoria — Chat com IA para Help Desk

> Auditoria de código para preparação de Arquitetura em Camadas.
> Escopo: fluxo conversacional de abertura de demanda (`/nova-solicitacao` → `demands`).
> Data: 2026-07-29. Nenhuma alteração de código foi feita nesta auditoria.

## Sumário executivo

O fluxo **já está parcialmente em camadas** e o desenho é melhor que a média:
existe um domínio puro (`src/domain/demand`), uma fachada de IA
(`aiOrchestrator`), uma camada de acesso a dados (`src/modules/demand-access`)
e toda a chamada de LLM está no servidor (Edge Functions), nunca no browser.

Os problemas reais não são de organização, e sim de **resiliência e
validação**: não há timeout nem retry nas chamadas de IA, não há validação de
schema na fronteira cliente↔Edge Function, o rate limit é *fail-open*, a
conversa é 100% efêmera (um refresh apaga tudo) e o `system_id` é gravado
sempre como `null` por decisão temporária.

---

## 1. Mapeamento de componentes (UI)

```
src/pages/
└── AIWorkspace.tsx                 Página/rota. Só orquestra fases e monta a árvore.

src/components/ai-workspace/        Camada de apresentação do chat (11 componentes, todos memo)
├── WelcomeSection.tsx              Saudação inicial.
├── QuickActions.tsx                5 cartões (Bug / Melhoria / Automação / Feature / Dúvida).
│                                   → é ESTE o "formulário de triagem": não é form, é seed de prompt.
├── SuggestionCards.tsx             Alias semântico de QuickActions.
├── ChatContainer.tsx               Área rolável + autoscroll + role="log" aria-live.
├── ConversationMessage.tsx         Bolha individual (avatar Blink / foto do usuário).
├── TypingIndicator.tsx             Estado "pensando".
├── ConversationInput.tsx           Textarea, Enter=enviar / Shift+Enter=quebra.
├── ConversationHeader.tsx          Cabeçalho + "Nova conversa".
├── ConversationFooter.tsx          Contador de turnos.
├── EmptyConversation.tsx           Placeholder.
└── ConfirmDialog.tsx               AlertDialog de descarte.

src/modules/helpdesk/
└── PreviewDaDemanda.tsx            O "Preview Card". Read-only por decisão de produto:
                                    só "Confirmar" ou "Não é isso" (volta à conversa).
                                    Detalhes técnicos ficam em <Collapsible>.
```

**Observação de camada:** `AIWorkspace.tsx` é a única peça que conhece
simultaneamente UI e hook; nenhum componente de `ai-workspace/` importa
Supabase, Edge Function ou tipo de tabela. Essa fronteira está limpa.

**Ponto de atenção:** `ConversationMessage` renderiza `message.content` como
texto puro (`whitespace-pre-wrap`). Não há `react-markdown`. Se o modelo
devolver markdown (e ele devolve, em descrições longas), o usuário lê `**`.

---

## 2. Gerenciamento de estado

Tudo em **`src/hooks/useAIWorkspace.ts`** (315 linhas), com `useState` local —
sem Zustand, sem Context, sem persistência.

```ts
export type Phase = "welcome" | "chatting" | "processing" | "preview" | "submitting";

const [phase, setPhase]       = useState<Phase>("welcome");
const [messages, setMessages] = useState<ChatMsg[]>([]);
const [thinking, setThinking] = useState(false);
const [preview, setPreview]   = useState<AiPreview | null>(null);
const cancelled               = useRef(false);   // guarda contra setState pós-reset
```

Máquina de estados: `welcome → chatting → processing → preview → submitting`.
Limite de 2 turnos do usuário no cliente (`MAX_USER_TURNS = 2`); o servidor
impõe 4 como cinto de segurança.

Derivações são memoizadas e o objeto que vai para o banco é derivado, não
duplicado — o preview mostra exatamente o que será gravado:

```ts
const demandaDoPreview = useMemo<NovaDemanda | null>(() => {
  if (!preview) return null;
  return {
    titulo: preview.titulo,
    resumo: preview.descricao,
    descricaoTecnica: preview.justificativa ?? "",
    tipo: tipoDeClassificacao(preview.tipoDemanda, `${preview.titulo} ${preview.descricao}`),
    complexidade: complexidadeDeEscala(preview.complexidadeDev),
    prioridade: prioridadeDeScore(previewScore),
    sistemaId: null,                        // ⚠️ ver §5.6
    criteriosDeAceite: criteriosMinimos(preview.titulo, []),
    origemIa: true,
    confianca: preview.intent?.confidence ?? 0.5,
  };
}, [preview, previewScore]);
```

**Gargalo:** estado 100% em memória. Refresh, navegação acidental ou crash =
conversa perdida, e o usuário recomeça do zero. Não há `sessionStorage`, nem
tabela de conversas.

---

## 3. Lógica de integração com a IA

### 3.1 Cadeia de chamada

```
useAIWorkspace  →  aiOrchestrator  →  aiWorkspaceService  →  supabase.functions.invoke
   (React)         (fachada/regra)      (I/O isolado)              (Edge Function)
```

A UI **nunca** fala com Supabase. Regra explícita em `ai-orchestrator.ts`.

```ts
// src/modules/ai/services/ai-orchestrator.ts
async finalize(input: OrchestratorFinalizeInput): Promise<OrchestratorFinalizeResult> {
  const descricao = await aiWorkspaceService.generateDescription(input.conversation);
  const titulo = deriveTitulo(descricao);              // heurística local: 1ª sentença
  const [triagem, similares] = await Promise.all([     // paralelo
    aiWorkspaceService.triage(titulo, descricao, input.sistemas),
    aiWorkspaceService.similar(titulo, descricao),
  ]);
  const decision = this.decide(input.conversation, {
    suggestedSystem: triagem.sistema_alvo_slug,
    workspaceContext: input.workspaceContext,
  });
  return { titulo, descricao, triagem, similares, decision };
}
```

```ts
// src/modules/ai/services/ai-workspace-service.ts — única porta de I/O
async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
  return data as T;
}
```

### 3.2 Edge Functions (todas com `verify_jwt = true`)

| Function | Papel |
|---|---|
| `assistente-demanda` | `next_question` e `generate_description` |
| `triagem-demanda` | classificação + scores 0–10 (JSON estrito) |
| `demandas-similares` | deduplicação |
| `match-ecossistema` | enriquecimento em background |

### 3.3 System prompts

**Conversa** (`assistente-demanda`) — prompt de *persona + método*, sem
formato de saída rígido:

```
Você é o Blink, o assistente do Gestor de Automações...
COMO VOCÊ FALA
- Português do Brasil, tom de colega de trabalho...
- Frases curtas. Uma pergunta por vez.
- Use as palavras que a pessoa usou...
O QUE VOCÊ PRECISA ENTENDER
1. O que a pessoa faz hoje nesse processo  2. Frequência e contexto
3. Onde exatamente trava                    4. O que espera quando resolvido
O QUE VOCÊ NÃO FAZ
- Não sugere solução, não estima prazo, não inventa dado.
```
+ sufixo dinâmico com contagem de turnos e a sentinela `"[FIM]"`.

**Tradução natural → técnica** (`triagem-demanda`) — prompt de *contrato JSON*:

```
Devolva APENAS um objeto JSON... com EXATAMENTE estes campos:
{ "frequencia": 0-10, "dificuldade": 0-10, "retorno": 0-10,
  "complexidade_dev": 0-10,
  "tipo_demanda": "ajuste_existente" | "novo_modulo" | "novo_sistema" | null,
  "sistema_alvo_slug": string | null,   // slug EXATO da lista, ou null
  "justificativa": string }
- sistema_alvo_slug: SOMENTE um slug presente na lista SISTEMAS. NUNCA invente slug.
```

Modelo em ambas: `google/gemini-3-flash-preview`, via
`_shared/ia-gateway.ts` → HUB Bloco ID, com fallback para
`ai.gateway.lovable.dev`. Erros **de uso** (429/402) são propagados e *não*
acionam fallback; erros de infraestrutura sim.

**Ponto forte:** a saída da IA é sanitizada no servidor, não confiada:

```ts
const TIPOS_VALIDOS = new Set(["ajuste_existente","novo_modulo","novo_sistema"]);
const tipo_demanda  = tipoRaw && TIPOS_VALIDOS.has(tipoRaw) ? tipoRaw : null;
let sistema_alvo_slug = null;
if (slugRaw && slugsValidos.has(slugRaw) && tipo_demanda !== "novo_sistema") sistema_alvo_slug = slugRaw;
const clamped = clamp10(parsed.frequencia); // 0..10, NaN → 5
```
E o score final é **server-authoritative** (`computeScoreSolicitante`), não vem
do modelo.

---

## 4. Camada de dados

### 4.1 `public.demands` (destino do ticket gerado)

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `title` | text NOT NULL | |
| `description` | text | resumo + `---` + descrição técnica |
| `system_id` | uuid FK | **hoje sempre `null`** vindo da IA |
| `status` | enum `demand_status` | default `backlog` |
| `priority` | enum `demand_priority` | default `media` |
| `type` | enum `demand_type` | default `melhoria` |
| `complexity` | enum `demand_complexity` | default `media` |
| `assigned_to` / `created_by` | uuid | `created_by` NOT NULL |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete |
| `sla_due_at`, `sla_first_response_at`, `sla_status` | — | SLA |
| `ai_auto_responded`, `ai_confidence_score`, `ai_response_article_id`, `ai_response_comment_id` | — | trilha de IA |

`public.demand_tasks` — critérios de aceite viram checklist real
(`demand_id`, `title`, `completed`, `order_index`).
`public.ia_uso_log` — telemetria (`acao`, `modelo`, `tokens_in/out`, `status`,
`user_id`) e **base do rate limit**.
`public.sla_policies` — `priority` → `resolution_time_hours`.

### 4.2 RLS

```
demands  INSERT  WITH CHECK (created_by = auth.uid())
         SELECT  (deleted_at IS NULL AND (created_by = uid OR assigned_to = uid)) OR has_role(uid,'admin')
         UPDATE  created_by = uid OR assigned_to = uid OR is_equipe() OR admin
         DELETE  created_by = uid OR admin
ia_uso_log SELECT  admin OR user_id = auth.uid()
```

⚠️ `demand_tasks` tem RLS **muito frouxa**: as 4 policies exigem apenas que a
demanda exista e não esteja deletada — **qualquer usuário autenticado lê,
cria, edita e apaga tarefas de qualquer demanda**, inclusive de demandas que
ele não pode nem ler via `demands_select_scoped`. Vazamento de conteúdo entre
solicitantes.

### 4.3 Gravação

```ts
// src/modules/demand-access/useCriarDemanda.ts
const criada = await createDemand({ title, description, system_id, type, priority, complexity });
for (const criterio of nova.criteriosDeAceite) {
  await createTask(criada.id, criterio);   // série: order_index depende do anterior
}
await qc.invalidateQueries({ queryKey: ["demands"] });
```

---

## 5. Gargalos identificados

### 5.1 Sem timeout, sem retry, sem cancelamento (ALTO)
`supabase.functions.invoke` não recebe `AbortSignal`. Se o gateway pendurar, o
usuário fica em "Estruturando sua solicitação…" indefinidamente — sem botão de
cancelar. `cancelled.current` só protege contra `setState` após `reset()`; a
requisição continua viva.
**Ação:** `AbortController` com timeout (~30 s), botão "cancelar", 1 retry com
backoff apenas em falha de rede/5xx (nunca em 429/402).

### 5.2 `finalize()` é tudo-ou-nada (ALTO)
`generateDescription` roda primeiro; se falhar, volta para `chatting` e a
conversa inteira precisa ser refinalizada. E em `Promise.all`, a falha da
triagem derruba o preview mesmo com descrição pronta (`similar()` já degrada
para `[]`, triagem não).
**Ação:** `Promise.allSettled` + preview degradado com scores neutros e aviso.

### 5.3 Rate limit *fail-open* e não atômico (MÉDIO/ALTO)
`checkRateLimit` conta linhas em `ia_uso_log`; qualquer erro de consulta
retorna `permitido: true`. Também é *check-then-act* — rajadas paralelas
passam. E `userId: null` (chamada sem JWT válido) → **permitido**.
**Ação:** contador atômico via RPC `SECURITY DEFINER`, fail-closed para
usuário autenticado.

### 5.4 Sem validação de schema na fronteira (MÉDIO)
Cliente: `data as T` — cast cego, sem Zod. Servidor: `messages` só é checado
com `Array.isArray`; não há limite de quantidade de mensagens, nem de tamanho
de `content`. Um payload de 500 KB entra direto no prompt (custo + risco de
prompt injection via conteúdo colado pelo usuário).
**Ação:** Zod nos dois lados; teto de ~20 mensagens e ~4.000 chars por mensagem.

### 5.5 Conversa efêmera (MÉDIO)
Refresh apaga tudo. Sem persistência não há como auditar o que a IA perguntou,
nem retomar. Também impede avaliar qualidade dos prompts em produção.
**Ação:** `ai_conversations` / `ai_messages` com RLS por `user_id`, ou no
mínimo `sessionStorage`.

### 5.6 `system_id` sempre nulo (MÉDIO)
Decisão consciente e documentada em código: a IA devolve um **slug** do
ecossistema, e `demands.system_id` é um **uuid** de outro catálogo. Hoje grava
`null`, o vínculo fica só em `salvarMatchEcossistema` (background, best-effort,
com `catch {}` silencioso).
**Ação:** tabela/função de tradução slug → uuid, ou coluna `system_slug`.

### 5.7 RLS de `demand_tasks` (ALTO — segurança)
Ver §4.2. Deve espelhar `demands_select_scoped`.

### 5.8 Criação não é transacional (MÉDIO)
`createDemand` + N × `createTask` em série. Falha na 3ª tarefa deixa demanda
criada com checklist parcial e o usuário vê erro — e um retry duplica a
demanda (não há chave de idempotência).
**Ação:** RPC única `create_demand_with_tasks(payload jsonb)`.

### 5.9 CORS com fallback permissivo demais (BAIXO/MÉDIO)
`ALLOWED_PATTERNS` aceita **qualquer** `*.lovable.app` e
`*.lovableproject.com` — inclui projetos de terceiros. Como `verify_jwt=true`,
o impacto é limitado, mas o `Origin` de terceiro é ecoado.

### 5.10 Menores
- `data as any` nos handlers das Edge Functions (perda de tipagem no ponto mais volátil).
- Sem `react-markdown` no chat (§1).
- `salvarMatchEcossistema` com `catch {}` vazio — falha invisível, nem em log.
- `MAX_USER_TURNS = 2` no cliente vs. `4` no servidor: divergência silenciosa.

---

## 6. Plano sugerido para a Arquitetura em Camadas

O alvo já está quase desenhado; falta formalizar e endurecer.

```
┌─ Presentation ──── src/components/ai-workspace/ + src/modules/helpdesk/
│                    (puro, sem I/O — JÁ ESTÁ)
├─ Application ───── src/hooks/useAIWorkspace.ts (state machine)
│                    → extrair a máquina para reducer puro e testável
├─ Domain ────────── src/domain/demand/ (puro, sem React — JÁ ESTÁ)
├─ Orchestration ─── src/modules/ai/ (aiOrchestrator, intent, pipelines — JÁ ESTÁ)
├─ Data Access ───── src/modules/demand-access/ (JÁ ESTÁ)
└─ Infrastructure ── supabase/functions/ + _shared/ (IA, CORS, rate limit)
```

**Ordem recomendada:**

| Sprint | Entrega | Motivo |
|---|---|---|
| 1 | RLS de `demand_tasks`; rate limit atômico fail-closed | Segurança, sem UI |
| 2 | Zod nas duas fronteiras + limites de payload | Contrato explícito entre camadas |
| 3 | Timeout/abort/retry + `allSettled` no `finalize` | Maior dor percebida hoje |
| 4 | RPC transacional `create_demand_with_tasks` + idempotência | Integridade |
| 5 | Persistência de conversa + markdown no chat | Auditoria e UX |
| 6 | Resolução `slug → system_id` | Fecha o dado que hoje nasce nulo |
