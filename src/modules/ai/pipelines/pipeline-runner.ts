import type { PipelineContext, PipelineResult } from "./pipeline-types";
import { getPipelineDefinition } from "./pipeline-registry";

/**
 * Pipeline Runner — apenas encaminha para o pipeline correto.
 * Não contém regras de negócio nem faz I/O.
 */
export function runPipeline(ctx: PipelineContext): PipelineResult {
  const def = getPipelineDefinition(ctx.classification.pipeline);
  return {
    pipeline: def.id,
    target: def.target,
    handlerKey: def.handlerKey,
    classification: ctx.classification,
  };
}
