// Detecção leve de boards para o passo 3 do Wizard.
// Não substitui o parser server-side (fonte da verdade continua sendo o adapter).
import JSZip from "jszip";
import type { DetectedBoard, DetectedFile } from "./types";

const HTML_HINT =
  "Este arquivo parece ser uma página HTML do Trello, não um export JSON. " +
  "No Trello, abra o quadro → Menu → Mais → Imprimir e exportar → Exportar como JSON, " +
  "e salve o resultado como .json.";

function looksLikeHtml(text: string): boolean {
  const head = text.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<head");
}

async function detectFromJsonText(text: string): Promise<DetectedFile> {
  if (looksLikeHtml(text)) {
    return { kind: "json", boards: [], invalidReason: HTML_HINT };
  }
  try {
    const obj = JSON.parse(text);
    // Trello single-board export: { id, name, lists, cards, ... }
    if (obj && typeof obj === "object" && typeof obj.id === "string" && typeof obj.name === "string") {
      const cards = Array.isArray(obj.cards) ? obj.cards.length : undefined;
      return { kind: "json", boards: [{ external_id: obj.id, nome: obj.name, cards }] };
    }
    // Workspace export: { boards: [ {id, name}, ... ] }
    if (obj && Array.isArray(obj.boards)) {
      const boards: DetectedBoard[] = obj.boards
        .filter((b: any) => b && typeof b.id === "string" && typeof b.name === "string")
        .map((b: any) => ({ external_id: b.id, nome: b.name }));
      if (boards.length > 0) return { kind: "json", boards };
    }
    return {
      kind: "json",
      boards: [],
      invalidReason:
        "JSON não reconhecido como export do Trello (esperado objeto com id/name/lists ou boards[]).",
    };
  } catch {
    return {
      kind: "json",
      boards: [],
      invalidReason: "Arquivo .json inválido — não foi possível fazer o parse.",
    };
  }
}

async function detectFromZip(file: File): Promise<DetectedFile> {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const boards: DetectedBoard[] = [];
    const entries = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith(".json"));
    // Limita a 50 arquivos para detecção rápida
    for (const entry of entries.slice(0, 50)) {
      try {
        const text = await entry.async("string");
        const obj = JSON.parse(text);
        if (obj && typeof obj.id === "string" && typeof obj.name === "string" && Array.isArray(obj.lists)) {
          boards.push({
            external_id: obj.id,
            nome: obj.name,
            cards: Array.isArray(obj.cards) ? obj.cards.length : undefined,
          });
        }
      } catch { /* ignore individual entry */ }
    }
    if (boards.length > 0) return { kind: "zip", boards };
  } catch { /* ignore */ }
  return { kind: "zip", boards: [], fallback: true };
}

export async function detectBoardsFromFile(file: File): Promise<DetectedFile> {
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".zip")) return detectFromZip(file);
  const text = await file.text();
  return detectFromJsonText(text);
}
