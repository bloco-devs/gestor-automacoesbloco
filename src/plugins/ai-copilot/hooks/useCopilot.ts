import { useSyncExternalStore } from "react";
import { listMessages, subscribeMemory } from "../memory";
import { copilotEventHistory, subscribeCopilotEvents } from "../events";
import { listDiagnostics, subscribeDiagnostics } from "../utils/diagnostics";
import { stableSnapshot } from "@/lib/stable-snapshot";

const getMessages = stableSnapshot(listMessages);
const getEvents = stableSnapshot(copilotEventHistory);
const getDiagnostics = stableSnapshot(listDiagnostics);

export function useCopilotMessages() {
  return useSyncExternalStore(subscribeMemory, getMessages, getMessages);
}

export function useCopilotEvents() {
  return useSyncExternalStore(subscribeCopilotEvents, getEvents, getEvents);
}

export function useCopilotDiagnostics() {
  return useSyncExternalStore(subscribeDiagnostics, getDiagnostics, getDiagnostics);
}
