import { registerFlags } from "./registry";

export const AUTOMATION_FLAGS = {
  library: "automations.library",
  teams: "automations.channel.teams",
  whatsapp: "automations.channel.whatsapp",
} as const;

registerFlags([
  { key: AUTOMATION_FLAGS.library, category: "automation", description: "Marketplace de automações prontas", defaultValue: false },
  { key: AUTOMATION_FLAGS.teams, category: "automation", description: "Canal Microsoft Teams", defaultValue: false },
  { key: AUTOMATION_FLAGS.whatsapp, category: "automation", description: "Canal WhatsApp", defaultValue: false },
]);
