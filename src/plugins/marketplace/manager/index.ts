/**
 * Manager — envelopa o pluginHost com uma API estável de gerenciamento.
 * Nenhum plugin é modificado; apenas invoca hooks já existentes.
 */
import { pluginHost } from "@/platform-sdk/runtime";

export interface ManagerActionResult {
  ok: boolean;
  message: string;
}

async function guard(
  action: () => Promise<void>,
  okMsg: string
): Promise<ManagerActionResult> {
  try {
    await action();
    return { ok: true, message: okMsg };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export const pluginManager = {
  enable: (id: string) => guard(() => pluginHost.enable(id), "Plugin habilitado"),
  disable: (id: string) => guard(() => pluginHost.disable(id), "Plugin desabilitado"),
  reload: (id: string) => guard(() => pluginHost.reload(id), "Plugin recarregado"),
  restart: async (id: string): Promise<ManagerActionResult> => {
    // Semanticamente equivalente a reload: disable + enable.
    return guard(() => pluginHost.reload(id), "Plugin reiniciado");
  },
  /**
   * Simulação de atualização — não altera o manifest, apenas força
   * um ciclo completo de disable/enable e retorna feedback.
   * Placeholder para v2.1 (instalação remota).
   */
  simulateUpdate: async (id: string): Promise<ManagerActionResult> => {
    const r = await guard(() => pluginHost.reload(id), "Atualização simulada aplicada");
    return {
      ok: r.ok,
      message: r.ok
        ? `${r.message} · pipeline pronto para instalação remota (v2.1)`
        : r.message,
    };
  },
};

export type PluginManager = typeof pluginManager;
