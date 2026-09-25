import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SISTEMAS_CONHECIDOS, blocoDeVocabulario } from "../../../../supabase/functions/_shared/vocabulario";
import { SISTEMAS_ECOSSISTEMA_BLOCO_ID } from "@/domain/demand/services/siglaDoSistema";

/**
 * O DEFEITO QUE ESTES TESTES TRANCAM
 *
 * A ATIV-2609-0001 ("Seletor de empreendimento no menu lateral") era da Gestão
 * de Obra e nasceu no Gestor de Atividades Líderes. Uma das causas: seis
 * sistemas do vocabulário e dos apelidos da triagem estavam com slug que não
 * existe no HUB — `obra` em vez de `produtividade`, `suprimentos` em vez de
 * `locacao`, e mais quatro.
 *
 * Os dois lugares que leem esse vocabulário filtram pelos slugs do HUB. Com a
 * chave errada, o sistema era descartado EM SILÊNCIO: o chat do Blink nunca
 * soube o que a Gestão de Obra faz, e a triagem nunca usou as palavras dela.
 * O comentário de `SistemaConhecido.slug` dizia "precisa bater com o que o HUB
 * devolve" — a regra existia; faltava quem a conferisse.
 *
 * A fonte da verdade é `demand_prefixo_slug`: é por ela que o banco monta o
 * código do chamado, então é a lista de slugs com que o sistema de fato opera.
 */
function slugsDoHub(): Set<string> {
  const dir = path.resolve(process.cwd(), "supabase/migrations");
  const arquivo = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse()
    .find((f) => readFileSync(path.join(dir, f), "utf8").includes("FUNCTION public.demand_prefixo_slug"));
  if (!arquivo) throw new Error("migration de demand_prefixo_slug não encontrada");
  const sql = readFileSync(path.join(dir, arquivo), "utf8");
  const corpo = sql.slice(sql.indexOf("FUNCTION public.demand_prefixo_slug"));
  const slugs = [...corpo.matchAll(/WHEN '([a-z0-9-]+)'\s+THEN '/g)].map((m) => m[1]);
  if (slugs.length < 10) throw new Error(`só ${slugs.length} slugs lidos de ${arquivo} — o formato mudou?`);
  return new Set(slugs);
}

/** As chaves de APELIDOS_BASE, lidas do texto: o arquivo importa de URL e não roda no vitest. */
function chavesDosApelidos(): string[] {
  const src = readFileSync(path.resolve(process.cwd(), "supabase/functions/triagem-demanda/index.ts"), "utf8");
  const ini = src.indexOf("const APELIDOS_BASE");
  const bloco = src.slice(ini, src.indexOf("\n};", ini));
  return [...bloco.matchAll(/^\s+"?([a-z0-9-]+)"?:\s*\[/gm)].map((m) => m[1]);
}

function apelidosDe(slug: string): string[] {
  const src = readFileSync(path.resolve(process.cwd(), "supabase/functions/triagem-demanda/index.ts"), "utf8");
  const ini = src.indexOf("const APELIDOS_BASE");
  const bloco = src.slice(ini, src.indexOf("\n};", ini));
  const m = bloco.match(new RegExp(`^\\s+"?${slug}"?:\\s*\\[([^\\]]*)\\]`, "m"));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
}

/**
 * Nó do mapa do ecossistema (a identidade/SSO), não sistema que recebe
 * chamado — por isso não tem prefixo em demand_prefixo_slug. Se um dia virar
 * destino de demanda, entra lá e sai daqui.
 */
const FORA_DO_PREFIXO_POR_DESENHO = new Set(["hub-bloco-id"]);

describe("todo slug que o Blink conhece existe no HUB", () => {
  const hub = slugsDoHub();

  it("vocabulário compartilhado (chat do Blink e triagem)", () => {
    const orfaos = SISTEMAS_CONHECIDOS.map((s) => s.slug).filter((s) => !hub.has(s));
    expect(orfaos, "slugs do vocabulário que o HUB não conhece — o sistema é descartado em silêncio").toEqual([]);
  });

  it("apelidos da triagem", () => {
    const orfaos = chavesDosApelidos().filter((s) => !hub.has(s) && !FORA_DO_PREFIXO_POR_DESENHO.has(s));
    expect(orfaos, "chaves de APELIDOS_BASE que o HUB não conhece — os apelidos nunca são lidos").toEqual([]);
  });

  it("a tela sabe o nome de todo slug do HUB", () => {
    const semNome = [...hub].filter((s) => !SISTEMAS_ECOSSISTEMA_BLOCO_ID[s]);
    expect(semNome, "slugs do HUB sem nome em SISTEMAS_ECOSSISTEMA_BLOCO_ID").toEqual([]);
  });
});

describe("regressão: a Gestão de Obra volta a existir para o Blink", () => {
  it("o chat recebe o que a Obra faz quando o HUB manda o slug real", () => {
    const bloco = blocoDeVocabulario([
      { slug: "produtividade", nome: "Gestão de Obra" },
      { slug: "atividades", nome: "Gestor de Atividades Líderes" },
    ]);
    expect(bloco).toContain("Gestão de Obra");
    expect(bloco).toMatch(/Gestão de Obra\n\s+O que faz: .*obra/i);
  });

  it("os apelidos de Atividades não têm palavra comum que roube demanda de outro sistema", () => {
    const termos = apelidosDe("atividades").map((t) => t.toLowerCase());
    expect(termos.length).toBeGreaterThan(0);
    for (const generico of ["atividades", "quadro", "kanban"]) {
      expect(termos, `"${generico}" é palavra de qualquer sistema`).not.toContain(generico);
    }
  });

  it("o slug 'atividades' não vira termo de busca sozinho", () => {
    const src = readFileSync(path.resolve(process.cwd(), "supabase/functions/triagem-demanda/index.ts"), "utf8");
    expect(src).toMatch(/const SLUGS_GENERICOS = new Set\(\[[^\]]*"atividades"/);
    expect(src).toMatch(/SLUGS_GENERICOS\.has\(s\.slug\)/);
  });

  it("apelidos que estavam mortos não acordam com palavra genérica", () => {
    expect(apelidosDe("desenvolvimento-produto").map((t) => t.toLowerCase())).not.toContain("projeto");
    expect(apelidosDe("nakhon-contratos").map((t) => t.toLowerCase())).not.toContain("contrato");
  });
});
