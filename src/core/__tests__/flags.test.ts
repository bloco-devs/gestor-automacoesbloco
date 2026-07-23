import { describe, it, expect, beforeEach } from "vitest";
import {
  registerFlags,
  isFlagEnabled,
  setFlagOverride,
  __resetFlagRegistry,
  listFlags,
} from "@/core/flags";

// Re-registra depois do reset porque o registry é global.
import "@/core/flags";

describe("core/flags", () => {
  beforeEach(() => {
    __resetFlagRegistry();
    registerFlags([
      { key: "test.a", category: "kanban", description: "A", defaultValue: false },
      { key: "test.b", category: "kanban", description: "B", defaultValue: true },
    ]);
  });

  it("respeita defaults", () => {
    expect(isFlagEnabled("test.a")).toBe(false);
    expect(isFlagEnabled("test.b")).toBe(true);
  });

  it("override em memória tem precedência", () => {
    setFlagOverride("test.a", true);
    expect(isFlagEnabled("test.a")).toBe(true);
    setFlagOverride("test.a", null);
    expect(isFlagEnabled("test.a")).toBe(false);
  });

  it("chaves desconhecidas retornam false", () => {
    expect(isFlagEnabled("nope")).toBe(false);
  });

  it("registerFlags é idempotente", () => {
    registerFlags([{ key: "test.a", category: "kanban", description: "dup", defaultValue: true }]);
    const found = listFlags().find((f) => f.key === "test.a");
    expect(found?.defaultValue).toBe(false);
  });
});
