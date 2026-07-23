/**
 * Conversation Memory — apenas em memória de sessão.
 * Sem banco, sem persistência.
 */
import type { CopilotMessage } from "./types";

const messages: CopilotMessage[] = [];
const listeners = new Set<() => void>();
const MAX_MESSAGES = 50;

function emit() {
  for (const l of listeners) l();
}

export function appendMessage(msg: CopilotMessage): void {
  messages.push(msg);
  if (messages.length > MAX_MESSAGES) messages.shift();
  emit();
}

export function listMessages(): readonly CopilotMessage[] {
  return messages.slice();
}

export function clearMemory(): void {
  messages.length = 0;
  emit();
}

export function subscribeMemory(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function __resetMemoryForTests() {
  messages.length = 0;
  listeners.clear();
}
