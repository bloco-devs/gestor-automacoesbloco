import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXTENSION_POINTS } from "@/platform-sdk";
import type { CatalogEntry, CatalogFilter } from "../types";

interface Props {
  filter: CatalogFilter;
  onChange: (f: CatalogFilter) => void;
  entries: CatalogEntry[];
}

export function MarketplaceToolbar({ filter, onChange, entries }: Props) {
  const capabilities = Array.from(
    new Set(
      entries.flatMap((e) => [...e.capabilitiesRequired, ...e.capabilitiesProvided])
    )
  ).sort();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar plugin, autor, descrição…"
        value={filter.query ?? ""}
        onChange={(e) => onChange({ ...filter, query: e.target.value })}
        className="h-9 w-64"
      />
      <Select
        value={filter.category ?? "all"}
        onValueChange={(v) => onChange({ ...filter, category: v as CatalogFilter["category"] })}
      >
        <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Categoria</SelectItem>
          {["ai", "admin", "workspace", "portal", "operations", "analytics", "knowledge", "integration", "misc"].map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.status ?? "all"}
        onValueChange={(v) => onChange({ ...filter, status: v as CatalogFilter["status"] })}
      >
        <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Status</SelectItem>
          {["active", "disabled", "loaded", "registered", "error", "rejected", "unregistered"].map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.capability ?? "all"}
        onValueChange={(v) => onChange({ ...filter, capability: v })}
      >
        <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Capability" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Capability</SelectItem>
          {capabilities.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.extensionPoint ?? "all"}
        onValueChange={(v) => onChange({ ...filter, extensionPoint: v as CatalogFilter["extensionPoint"] })}
      >
        <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Extension point" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Extension point</SelectItem>
          {EXTENSION_POINTS.map((e) => (
            <SelectItem key={e} value={e}>{e}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filter.sort ?? "name"}
        onValueChange={(v) => onChange({ ...filter, sort: v as CatalogFilter["sort"] })}
      >
        <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Ordenar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Nome</SelectItem>
          <SelectItem value="status">Status</SelectItem>
          <SelectItem value="load">Load time</SelectItem>
          <SelectItem value="category">Categoria</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
