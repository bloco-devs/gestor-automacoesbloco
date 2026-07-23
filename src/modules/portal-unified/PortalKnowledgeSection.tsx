import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { KnowledgeSuggestions } from "@/modules/knowledge";

/**
 * Barra de busca + sugestões reutilizando o Knowledge Engine existente.
 * Sem novos serviços.
 */
export function PortalKnowledgeSection() {
  const [q, setQ] = useState("");
  return (
    <section aria-label="Conhecimento" className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Conhecimento</h2>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar artigos, manuais, procedimentos…"
          className="h-11 pl-9"
          aria-label="Buscar na base de conhecimento"
        />
      </div>
      <KnowledgeSuggestions query={q} origin="portal" />
    </section>
  );
}
