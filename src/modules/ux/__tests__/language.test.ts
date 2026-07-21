import { describe, it, expect } from "vitest";
import {
  DICTIONARIES,
  SOLICITANTE_DICT,
  TECNICA_DICT,
  GESTOR_DICT,
  translate,
  FRIENDLY_ERRORS,
  DEFAULT_PERSONA,
} from "../language/dictionary";
import { personaFromRole } from "../language/providers/LanguageProvider";
import { resolveFriendlyError } from "../language/hooks";
import type { TermKey } from "../language/types";

describe("Language Dictionary", () => {
  it("todas as personas possuem as mesmas chaves", () => {
    const baseKeys = Object.keys(SOLICITANTE_DICT).sort();
    for (const p of Object.values(DICTIONARIES)) {
      expect(Object.keys(p).sort()).toEqual(baseKeys);
    }
  });

  it("solicitante nunca usa jargão técnico em chaves-chave", () => {
    const jargon = /\b(task|backlog|sprint|kanban|pipeline|workflow|ticket|issue|bug)\b/i;
    const keys: TermKey[] = ["task", "backlog", "sprint", "pipeline", "workflow", "ticket", "issue", "bug"];
    for (const k of keys) {
      expect(SOLICITANTE_DICT[k]).not.toMatch(jargon);
    }
  });

  it("técnica preserva termos originais", () => {
    expect(TECNICA_DICT.sprint).toBe("Sprint");
    expect(TECNICA_DICT.backlog).toBe("Backlog");
  });

  it("gestor usa linguagem executiva", () => {
    expect(GESTOR_DICT.ticket).toBe("Demanda");
    expect(GESTOR_DICT.epic).toBe("Iniciativa");
  });
});

describe("translate()", () => {
  it("retorna termo da persona pedida", () => {
    expect(translate("solicitante", "task")).toBe("Atividade");
    expect(translate("tecnica", "task")).toBe("Task");
  });

  it("faz fallback para solicitante se persona inválida", () => {
    // @ts-expect-error — testando fallback
    expect(translate("invalida", "task")).toBe("Atividade");
  });
});

describe("personaFromRole()", () => {
  it("mapeia roles internos para personas", () => {
    expect(personaFromRole("developer")).toBe("tecnica");
    expect(personaFromRole("builder")).toBe("tecnica");
    expect(personaFromRole("requester")).toBe("solicitante");
    expect(personaFromRole(null)).toBe(DEFAULT_PERSONA);
  });
});

describe("resolveFriendlyError()", () => {
  it("classifica timeout", () => {
    expect(resolveFriendlyError("Request timeout")).toBe(FRIENDLY_ERRORS.timeout);
  });
  it("classifica rate limit (429)", () => {
    expect(resolveFriendlyError("429 too many")).toBe(FRIENDLY_ERRORS.rateLimit);
  });
  it("classifica network", () => {
    expect(resolveFriendlyError("Failed to fetch")).toBe(FRIENDLY_ERRORS.network);
  });
  it("cai em genérico quando desconhecido", () => {
    expect(resolveFriendlyError("qualquer coisa")).toBe(FRIENDLY_ERRORS.generic);
  });
});
