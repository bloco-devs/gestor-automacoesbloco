import type { ReactElement } from "react";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";

/**
 * Renderiza `enabled` se a flag `ux.rewrite` estiver ligada, senão `disabled`.
 * Toda a FEATURE 026.2 fica protegida por este gate.
 */
export function UxRewriteGate({
  enabled,
  disabled,
}: {
  enabled: ReactElement;
  disabled: ReactElement;
}): ReactElement {
  const on = useFeatureFlag("ux.rewrite");
  return on ? enabled : disabled;
}
