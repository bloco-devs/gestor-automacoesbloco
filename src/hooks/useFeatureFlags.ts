import { useCallback, useEffect, useState } from "react";

export type FeatureFlagKey =
  | "copilot-dock"
  | "compact-density"
  | "beta-analytics"
  | "keyboard-hints"
  | "ux.rewrite";

export interface FeatureFlagDef {
  key: FeatureFlagKey;
  label: string;
  description: string;
  defaultValue: boolean;
}

export const ALL_FLAGS: FeatureFlagDef[] = [
  // Desligado por padrão desde a Onda 2. Havia tres coisas chamadas "Copilot"
  // na mesma tela — este dock de chat, o painel lateral do shell e o painel
  // analitico de Demandas. Dois deles disputavam a lateral direita enquanto o
  // terceiro flutuava por cima. O que sobrou e o analitico, porque a IA aqui
  // deve aparecer como analise da fila, nao como caixa de conversa.
  { key: "copilot-dock", label: "AI Copilot (dock flutuante)", description: "Assistente contextual em qualquer tela.", defaultValue: false },
  { key: "compact-density", label: "Densidade compacta", description: "Reduz paddings em listas e cards.", defaultValue: false },
  { key: "beta-analytics", label: "Analytics beta", description: "Visualizações experimentais em /admin/analytics.", defaultValue: false },
  { key: "keyboard-hints", label: "Atalhos visíveis", description: "Mostra dicas de teclado nos botões.", defaultValue: false },
  // A MESMA flag estava registrada em dois lugares com defaults opostos:
  // `src/core/flags/ux.flags.ts` declarava `true`, e aqui estava `false`. Como o
  // `UxRewriteGate` lê deste hook, valia o `false` — ou seja, todas as rotas
  // novas (/workspace/*, /portal/*, /gestao/*) redirecionavam de volta para as
  // páginas legadas. O sidebar unificado, que não passa pelo gate, apontava para
  // rotas que quicavam: clicar em "Demandas" caía no Pipeline Kanban antigo.
  // Alinhado em `true`, que é o valor que o outro registro já declarava.
  { key: "ux.rewrite", label: "Nova UX (Perfis)", description: "Ativa a nova navegação unificada por perfil (Portal/Workspace/Gestão/Admin).", defaultValue: true },
];

const STORAGE_KEY = "gab:featureFlags:v1";

type FlagsMap = Partial<Record<FeatureFlagKey, boolean>>;

function readStorage(): FlagsMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as FlagsMap;
  } catch {
    return {};
  }
}

function writeStorage(next: FlagsMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("gab:flags-changed", { detail: next }));
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FlagsMap>(() => readStorage());

  useEffect(() => {
    const handler = () => setFlags(readStorage());
    window.addEventListener("gab:flags-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("gab:flags-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setFlag = useCallback((key: FeatureFlagKey, value: boolean) => {
    setFlags((prev) => {
      const next = { ...prev, [key]: value };
      writeStorage(next);
      return next;
    });
  }, []);

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => {
      const def = ALL_FLAGS.find((f) => f.key === key);
      return flags[key] ?? def?.defaultValue ?? false;
    },
    [flags],
  );

  return { flags, setFlag, isEnabled };
}

export function useFeatureFlag(key: FeatureFlagKey) {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
