import { describe, it, expect } from "vitest";
import { classifyConversation } from "../intent/intent-engine";
import { INTENT_REGISTRY, listIntents } from "../intent/intent-registry";
import { resolveIntent } from "../intent/intent-resolver";
import { runPipeline } from "../pipelines/pipeline-runner";
import { PIPELINE_REGISTRY } from "../pipelines/pipeline-registry";
import { aiOrchestrator } from "../services/ai-orchestrator";
import type { Conversation } from "../types/conversation";

const convo = (text: string): Conversation => [{ role: "user", content: text }];

describe("Intent Registry", () => {
  it("expõe todas as intenções oficiais", () => {
    const ids = listIntents().map((d) => d.id).sort();
    expect(ids).toEqual(
      ["AUTOMATION","BUG","FEATURE_REQUEST","IMPROVEMENT","INCIDENT","KNOWLEDGE","QUESTION","SUPPORT","UNKNOWN"].sort(),
    );
  });

  it("cada intent aponta para um pipeline existente", () => {
    for (const def of listIntents()) {
      expect(PIPELINE_REGISTRY[def.pipeline]).toBeTruthy();
    }
  });
});

describe("Intent Resolver", () => {
  const cases: Array<[string, string]> = [
    ["O botão salvar não funciona.", "BUG"],
    ["Gostaria de exportar em PDF.", "FEATURE_REQUEST"],
    ["Como cadastrar um colaborador?", "QUESTION"],
    ["Quero automatizar a admissão.", "AUTOMATION"],
    ["O sistema está fora do ar.", "INCIDENT"],
    ["Existe alguma documentação sobre férias?", "KNOWLEDGE"],
    ["Gostaria de melhorar o dashboard.", "IMPROVEMENT"],
    ["Não consigo acessar.", "SUPPORT"],
    ["xyz banana random", "UNKNOWN"],
  ];

  it.each(cases)("classifica %s como %s", (text, expected) => {
    expect(resolveIntent(convo(text)).intent).toBe(expected);
  });
});

describe("Pipeline Runner", () => {
  it("encaminha BUG para o pipeline bug", () => {
    const c = classifyConversation(convo("botão não funciona"));
    const p = runPipeline({ conversation: convo("x"), classification: c });
    expect(p.pipeline).toBe("bug");
    expect(p.target).toBe(INTENT_REGISTRY.BUG.pipeline === "bug" ? "triagem-demanda" : p.target);
  });

  it("QUESTION vai para pipeline immediate-answer", () => {
    const c = classifyConversation(convo("como faço para cadastrar?"));
    const p = runPipeline({ conversation: convo("x"), classification: c });
    expect(p.handlerKey).toBe("immediate-answer");
  });
});

describe("AI Orchestrator", () => {
  it("retorna classification + pipeline em uma única chamada", () => {
    const d = aiOrchestrator.decide(convo("sistema fora do ar"));
    expect(d.classification.intent).toBe("INCIDENT");
    expect(d.classification.confidence).toBeGreaterThan(0);
    expect(d.pipeline.pipeline).toBe("incident");
  });

  it("propaga suggestedSystem", () => {
    const d = aiOrchestrator.decide(convo("não funciona"), { suggestedSystem: "RH" });
    expect(d.classification.suggestedSystem).toBe("RH");
  });

  it("QUESTION marca shouldRespondImmediately e não cria ticket", () => {
    const d = aiOrchestrator.decide(convo("como cadastrar colaborador?"));
    expect(d.classification.shouldRespondImmediately).toBe(true);
    expect(d.classification.shouldCreateTicket).toBe(false);
  });
});
