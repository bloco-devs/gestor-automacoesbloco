#!/usr/bin/env node
/**
 * COMPARAR MODELOS COM AS SUAS DEMANDAS REAIS
 *
 * Ficha técnica não decide isto. O que decide é: com estas dez conversas —
 * as suas, com o português que as pessoas realmente escrevem — qual modelo
 * devolve um título que presta, um tipo certo, e um slug que EXISTE?
 *
 * Este script não toca no sistema. Ele lê um arquivo de casos, roda cada um
 * em cada modelo, e escreve um relatório lado a lado para você ler.
 *
 * COMO RODAR
 *   export OPENROUTER_API_KEY=...        (a chave nunca entra neste arquivo)
 *   node scripts/comparar-modelos.mjs casos.json
 *
 * O ARQUIVO DE CASOS
 *   [
 *     { "nome": "salario nao caiu",
 *       "conversa": ["nao recebi meu salario", "conferi no extrato, nao tem nada"] }
 *   ]
 *
 * Rode `node scripts/comparar-modelos.mjs --exemplo` para gerar um modelo.
 */

import fs from "node:fs";

const CHAVE = process.env.OPENROUTER_API_KEY;

/**
 * Os candidatos. Troque à vontade — a graça e comparar o que voce cogita
 * de verdade, nao uma lista que alguem escolheu por voce.
 */
const MODELOS = [
  "google/gemini-3-flash-preview",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-5",
  "openai/gpt-5.1",
];

/**
 * O contrato que a triagem precisa cumprir. E o mesmo do sistema: enum
 * fechado, quatro numeros de 1 a 10, e um slug que precisa existir.
 *
 * O catalogo abaixo e de mentira de proposito. O que importa no teste nao e
 * acertar o sistema certo — e ver se o modelo INVENTA um slug fora da lista,
 * porque foi exatamente isso que derrubou o fluxo antes.
 */
const SISTEMAS = [
  { slug: "gestao-comercial", nome: "Gestão Comercial" },
  { slug: "gestor-rh", nome: "Gestor de RH" },
  { slug: "gestor-automacoes", nome: "Gestor de Automações" },
];

const INSTRUCAO = `Você recebe a conversa de alguém que abriu uma demanda no help desk e não sabe descrevê-la em termos técnicos.

Devolva SOMENTE um JSON, sem cercas de código, com exatamente estes campos:
{
  "titulo": string (máx 90 caracteres, específico, sem "problema com"),
  "descricao": string (o que a pessoa precisa, em 2 a 4 frases),
  "tipo_demanda": "ajuste_existente" | "novo_modulo" | "novo_sistema",
  "frequencia": número de 1 a 10,
  "dificuldade": número de 1 a 10,
  "retorno": número de 1 a 10,
  "complexidade_dev": número de 1 a 10,
  "justificativa": string (uma frase),
  "sistema_alvo_slug": um slug EXATO da lista, ou null
}

Sistemas disponíveis (use o slug exato ou null — nunca invente):
${SISTEMAS.map((s) => `- ${s.slug}: ${s.nome}`).join("\n")}`;

async function rodar(modelo, conversa) {
  const t0 = Date.now();
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CHAVE}`,
      "Content-Type": "application/json",
      "X-Title": "Comparacao de modelos - Gestor",
    },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: "system", content: INSTRUCAO },
        { role: "user", content: conversa.join("\n") },
      ],
      temperature: 0.2,
    }),
  });

  const ms = Date.now() - t0;
  if (!resp.ok) {
    return { erro: `HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`, ms };
  }
  const dados = await resp.json();
  const bruto = dados.choices?.[0]?.message?.content ?? "";
  const uso = dados.usage ?? {};

  let json = null;
  let erroDeFormato = null;
  try {
    json = JSON.parse(bruto.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
  } catch {
    erroDeFormato = "não devolveu JSON válido";
  }

  return { json, bruto, erroDeFormato, ms, uso };
}

/** As checagens que o sistema faz de verdade antes de gravar. */
function conferir(json) {
  if (!json) return ["sem JSON"];
  const problemas = [];
  const tipos = ["ajuste_existente", "novo_modulo", "novo_sistema"];
  if (!json.titulo || typeof json.titulo !== "string") problemas.push("título ausente");
  else if (json.titulo.length > 90) problemas.push(`título com ${json.titulo.length} caracteres`);
  if (!tipos.includes(json.tipo_demanda)) problemas.push(`tipo inválido: ${json.tipo_demanda}`);
  for (const campo of ["frequencia", "dificuldade", "retorno", "complexidade_dev"]) {
    const v = json[campo];
    if (typeof v !== "number" || v < 1 || v > 10) problemas.push(`${campo} fora de 1–10: ${v}`);
  }
  const slug = json.sistema_alvo_slug;
  // A alucinação que importa: um slug plausível que não existe passa em
  // qualquer validação superficial e só falha no INSERT, com 400.
  if (slug !== null && slug !== undefined && !SISTEMAS.some((s) => s.slug === slug)) {
    problemas.push(`slug INVENTADO: ${slug}`);
  }
  return problemas;
}

const EXEMPLO = [
  {
    nome: "salário não caiu",
    conversa: [
      "nao recebi meu salario esse mes",
      "conferi no extrato e nao tem nada, ja era pra ter caido dia 5",
    ],
  },
  {
    nome: "pedido vago",
    conversa: ["o sistema ta lento", "sei la, quando abro a tela de cliente demora"],
  },
];

async function principal() {
  if (process.argv.includes("--exemplo")) {
    fs.writeFileSync("casos.json", JSON.stringify(EXEMPLO, null, 2));
    console.log("Escrevi casos.json. Substitua pelas suas conversas reais e rode de novo.");
    return;
  }
  if (!CHAVE) {
    console.error("Falta OPENROUTER_API_KEY no ambiente.");
    console.error("  export OPENROUTER_API_KEY=...");
    process.exit(1);
  }
  const arquivo = process.argv[2] ?? "casos.json";
  if (!fs.existsSync(arquivo)) {
    console.error(`Não achei ${arquivo}. Rode com --exemplo para gerar um.`);
    process.exit(1);
  }
  const casos = JSON.parse(fs.readFileSync(arquivo, "utf8"));

  const linhas = ["# Comparação de modelos", "", `${casos.length} casos × ${MODELOS.length} modelos`, ""];
  const placar = Object.fromEntries(MODELOS.map((m) => [m, { falhas: 0, ms: 0, chamadas: 0 }]));

  for (const caso of casos) {
    linhas.push(`## ${caso.nome}`, "", "> " + caso.conversa.join("  \n> "), "");
    for (const modelo of MODELOS) {
      process.stderr.write(`${caso.nome} → ${modelo}\n`);
      const r = await rodar(modelo, caso.conversa);
      placar[modelo].chamadas += 1;
      placar[modelo].ms += r.ms;

      if (r.erro) {
        linhas.push(`### ${modelo}`, "", `**Falhou:** ${r.erro}`, "");
        placar[modelo].falhas += 1;
        continue;
      }
      const problemas = r.erroDeFormato ? [r.erroDeFormato] : conferir(r.json);
      if (problemas.length) placar[modelo].falhas += 1;

      linhas.push(
        `### ${modelo}`,
        "",
        `${r.ms} ms · ${r.uso.prompt_tokens ?? "?"} entrada / ${r.uso.completion_tokens ?? "?"} saída`,
        "",
        problemas.length ? `**Problemas:** ${problemas.join(" · ")}` : "**Passou em todas as checagens**",
        "",
        "```json",
        r.json ? JSON.stringify(r.json, null, 2) : r.bruto.slice(0, 600),
        "```",
        "",
      );
    }
  }

  linhas.push("## Placar", "", "| Modelo | Casos com problema | Tempo médio |", "|---|---|---|");
  for (const [m, p] of Object.entries(placar)) {
    linhas.push(`| ${m} | ${p.falhas}/${p.chamadas} | ${Math.round(p.ms / p.chamadas)} ms |`);
  }
  linhas.push(
    "",
    "> O placar mede só o que dá para medir sozinho: formato, faixas e slug inventado.",
    "> Se o título ficou bom e se a justificativa faz sentido, só você sabe — leia as saídas.",
  );

  fs.writeFileSync("comparacao-modelos.md", linhas.join("\n"));
  console.log("\nPronto: comparacao-modelos.md");
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
