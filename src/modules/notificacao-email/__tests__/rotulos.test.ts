import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { humanizeStatus } from "@/modules/portal-unified/statusHuman";
import type { DemandStatus } from "@/modules/demands/types";

/**
 * A MESMA REGRA MORA EM DOIS LUGARES, E ELES PRECISAM CONCORDAR
 *
 * Quem decide se um email sai é o trigger `trg_demanda_email`, comparando o
 * rótulo humano do status velho com o do novo. Esse rótulo é calculado por
 * `rotulo_humano_status` (SQL) — uma cópia de `humanizeStatus` (TypeScript),
 * porque um trigger não consegue chamar o front.
 *
 * O dia em que alguém mexer só num dos dois, o estrago é silencioso: nenhum
 * erro, nenhum teste vermelho, só emails a mais (ou a menos) chegando na caixa
 * de entrada de gente que não escolheu isso. Um status novo no enum é o caso
 * mais provável — entra no TypeScript junto com a tela, e ninguém lembra do
 * SQL.
 *
 * Este teste lê a migration e compara as duas tabelas de tradução literalmente.
 */

const STATUSES: DemandStatus[] = [
  "backlog",
  "a_fazer",
  "em_desenvolvimento",
  "em_testes",
  "homologacao",
  "concluido",
];

/** Acha a migration pelo conteúdo, não pelo nome — renomear não pode quebrar. */
function lerFuncaoSql(): string {
  const dir = path.resolve(process.cwd(), "supabase/migrations");
  const arquivo = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse()
    .find((f) => readFileSync(path.join(dir, f), "utf8").includes("FUNCTION public.rotulo_humano_status"));

  if (!arquivo) throw new Error("Migration de rotulo_humano_status não encontrada");
  return readFileSync(path.join(dir, arquivo), "utf8");
}

/** Extrai o CASE da função SQL como um mapa status → rótulo. */
function mapaDoSql(sql: string): Map<string, string> {
  const corpo = sql.slice(
    sql.indexOf("FUNCTION public.rotulo_humano_status"),
    sql.indexOf("-- 2. Preferências"),
  );
  const mapa = new Map<string, string>();
  for (const m of corpo.matchAll(/WHEN\s+'([a-z_]+)'\s+THEN\s+'([^']+)'/g)) {
    mapa.set(m[1], m[2]);
  }
  return mapa;
}

describe("rótulo humano do status: SQL e TypeScript", () => {
  const mapa = mapaDoSql(lerFuncaoSql());

  it("cobre todos os status do enum", () => {
    expect([...mapa.keys()].sort()).toEqual([...STATUSES].sort());
  });

  it.each(STATUSES)("traduz %s igual nos dois lados", (status) => {
    expect(mapa.get(status)).toBe(humanizeStatus(status).label);
  });

  /**
   * Se este teste quebrar, o email parou de ser raro. Os dois pares que
   * colapsam são o que impede o solicitante de receber aviso de arrastar
   * cartão entre colunas que, para ele, são a mesma coisa.
   */
  it("mantém os pares que colapsam — é deles que vem o silêncio", () => {
    expect(mapa.get("backlog")).toBe(mapa.get("a_fazer"));
    expect(mapa.get("em_desenvolvimento")).toBe(mapa.get("em_testes"));
  });

  it("mantém distintos os três momentos que geram email", () => {
    const distintos = new Set([
      mapa.get("a_fazer"),
      mapa.get("em_desenvolvimento"),
      mapa.get("homologacao"),
      mapa.get("concluido"),
    ]);
    expect(distintos.size).toBe(4);
  });
});
