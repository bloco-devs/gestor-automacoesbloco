import { definePlugin } from "../../core/definePlugin";

/**
 * HelloPlugin — plugin de exemplo (FEATURE 101).
 * Registra 1 command, 1 widget, 1 sidebar item, 1 capability e
 * 1 listener de evento. Nada é exposto fora do Sandbox /admin/sdk.
 */
export const HelloPlugin = definePlugin({
  id: "hello-plugin",
  name: "Hello Plugin",
  version: "1.0.0",
  category: "misc",
  description: "Plugin exemplo do Host Runtime (FEATURE 101).",
  author: "Platform SDK",
  permissions: {
    provides: ["hello.greet"],
  },
  commands: [
    {
      id: "hello.say",
      title: "Hello · Say Hi",
      description: "Emite um log de saudação.",
      run: () => {
        // eslint-disable-next-line no-console
        console.debug("[hello-plugin] hi 👋");
      },
    },
  ],
  widgets: [
    {
      id: "hello-card",
      slot: "dashboard",
      title: "Hello Widget",
      order: 100,
      render: () => null,
    },
  ],
  activate: (ctx) => {
    ctx.logger("hello-plugin ativado");
    ctx.bus.on("feature.enabled", (p) => {
      ctx.logger("hello-plugin viu feature.enabled", p);
    });
  },
});

export default HelloPlugin;
