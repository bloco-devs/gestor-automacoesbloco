import { useSyncExternalStore } from "react";
import { listMessages, subscribeMemory } from "../memory";
import { copilotEventHistory, subscribeCopilotEvents } from "../events";
import { listDiagnostics, subscribeDiagnostics } from "../utils/diagnostics";

export function useCopilotMessages() {
  return useSyncExternalStore(subscribeMemory, listMessages, listMessages);
}

export function useCopilotEvents() {
  return useSyncExternalStore(
    subscribeCopilotEvents,
    copilotEventHistory,
    copilotEventHistory,
  );
}

export function useCopilotDiagnostics() {
  return useSyncExternalStore(
    subscribeDiagnostics,
    listDiagnostics,
    listDiagnostics,
  );
}
