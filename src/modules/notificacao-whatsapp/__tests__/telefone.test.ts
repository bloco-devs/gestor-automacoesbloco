import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FORMATO_WHATSAPP, formatarTelefoneBR, normalizarTelefoneBR } from "../telefone";

describe("normalizarTelefoneBR — o que a pessoa digita vira o que a Uazapi aceita", () => {
  it.each([
    ["(11) 98765-4321", "5511987654321"],
    ["11987654321", "5511987654321"],
    ["+55 11 98765 4321", "5511987654321"],
    ["55 11 98765-4321", "5511987654321"],
    ["011 98765-4321", "5511987654321"],
    ["(83) 3222-1234", "558332221234"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarTelefoneBR(entrada)).toBe(esperado);
  });

  it("DDD errado é recusado, não reinterpretado como outro número", () => {
    // Regressão: isto virava "551987654321" — um número válido, de outra
    // pessoa, em Campinas. Recusar é a única resposta segura.
    expect(normalizarTelefoneBR("(01) 98765-4321")).toBeNull();
    expect(normalizarTelefoneBR("01987654321")).toBeNull();
  });

  it("DDD 55 não é confundido com o DDI", () => {
    // Santa Maria (RS). Olhando só o começo, isto viraria DDI 55 + um número
    // de 9 dígitos sem DDD — que não existe.
    expect(normalizarTelefoneBR("(55) 99876-5432")).toBe("5555998765432");
  });

  it.each([
    ["", "vazio"],
    ["1234", "curto demais"],
    ["(01) 98765-4321", "DDD com zero"],
    ["(10) 98765-4321", "DDD terminando em zero"],
    ["441234567890", "12 dígitos que não começam com 55"],
    ["55119876543210", "longo demais"],
  ])("recusa %s (%s)", (entrada) => {
    expect(normalizarTelefoneBR(entrada)).toBeNull();
  });

  it("tudo o que sai daqui passa na CHECK do banco", () => {
    for (const e of ["(11) 98765-4321", "(83) 3222-1234", "(55) 99876-5432"]) {
      expect(normalizarTelefoneBR(e)).toMatch(FORMATO_WHATSAPP);
    }
  });
});

describe("formatarTelefoneBR", () => {
  it("celular e fixo", () => {
    expect(formatarTelefoneBR("5511987654321")).toBe("+55 (11) 98765-4321");
    expect(formatarTelefoneBR("558332221234")).toBe("+55 (83) 3222-1234");
  });
});

/**
 * A regex do front e a CHECK do banco são a mesma regra em dois lugares. Se
 * divergirem, o front aceita um número que o banco recusa — e a pessoa marca
 * "acompanhar pelo WhatsApp", vê a demanda criada, e nunca recebe nada.
 */
describe("front e banco validam o telefone igual", () => {
  it("a regex de FORMATO_WHATSAPP é a da CHECK notif_pref_whatsapp_telefone_valido", () => {
    const dir = path.resolve(process.cwd(), "supabase/migrations");
    const arquivo = readdirSync(dir).find((f) =>
      readFileSync(path.join(dir, f), "utf8").includes("notif_pref_whatsapp_telefone_valido"),
    );
    expect(arquivo, "migration da CHECK não encontrada").toBeTruthy();
    const sql = readFileSync(path.join(dir, arquivo!), "utf8");
    const m = sql.match(/whatsapp_telefone\s*~\s*'([^']+)'/);
    expect(m, "CHECK com regex não encontrada").toBeTruthy();
    expect(m![1]).toBe(FORMATO_WHATSAPP.source);
  });
});
