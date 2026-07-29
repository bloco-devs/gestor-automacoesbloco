import { useEffect, useMemo, useRef } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { usePlatformContext } from "../providers/PlatformProvider";
import { useGlobalSearch } from "../hooks";
import { formatHotkey } from "../utils/hotkeys";
import type { PlatformCommand, SearchEntity } from "../types";

const MAX_RESULTS_PER_GROUP = 8;

/**
 * O icone ganha um berco, e o atalho vira tecla.
 *
 * Solto ao lado do texto, o icone flutuava numa altura que dependia do
 * desenho de cada simbolo — casa vazada senta diferente de engrenagem cheia, e
 * uma lista inteira assim parece tremida. Num quadrado de superficie fixa,
 * todos os icones ocupam a mesma caixa e a coluna fica reta.
 *
 * O atalho era texto cinza de 10px encostado na direita: lia-se como legenda,
 * nao como algo que se aperta. Com borda e fundo ele vira o que e — uma tecla.
 */
function Berco({ Icone }: { Icone?: React.ComponentType<{ className?: string; strokeWidth?: string | number }> }) {
  if (!Icone) return <span aria-hidden className="size-7 shrink-0" />;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md",
        "bg-muted/60 text-muted-foreground",
        "transition-colors duration-fast ease-standard",
        "group-data-[selected=true]:bg-background group-data-[selected=true]:text-foreground",
      )}
    >
      <Icone className="size-4" strokeWidth={1.75} />
    </span>
  );
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-auto shrink-0 rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-sans text-[10px] font-medium tabular-nums text-muted-foreground">
      {children}
    </kbd>
  );
}

export function CommandPalette() {
  const {
    paletteOpen,
    closePalette,
    role,
    registries,
    runCommand,
    navigate,
    markRecent,
    recentIds,
  } = usePlatformContext();
  const { query, setQuery, results } = useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen, setQuery]);

  const commands = useMemo<PlatformCommand[]>(
    () => registries.commands.listFor(role),
    [registries.commands, role],
  );

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, PlatformCommand[]>();
    for (const c of commands) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return Array.from(map.entries());
  }, [commands]);

  const searchResults = results.slice(0, MAX_RESULTS_PER_GROUP);
  const searchByType = useMemo(() => {
    const map = new Map<string, SearchEntity[]>();
    for (const r of searchResults) {
      const arr = map.get(r.item.type) ?? [];
      arr.push(r.item);
      map.set(r.item.type, arr);
    }
    return Array.from(map.entries());
  }, [searchResults]);

  const recentCommands = useMemo(() => {
    const ids = recentIds
      .filter((id) => id.startsWith("cmd:"))
      .map((id) => id.slice(4))
      .slice(0, 5);
    return ids
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is PlatformCommand => Boolean(c));
  }, [recentIds, commands]);

  function handleEntity(e: SearchEntity) {
    markRecent(`nav:${e.id}`);
    if (e.navigate) e.navigate(navigate);
    else if (e.route) navigate(e.route);
    closePalette();
  }

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={(o) => (o ? undefined : closePalette())}
    >
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={setQuery}
        placeholder="Buscar comandos, páginas e ações…"
        aria-label="Pesquisa global"
      />
      <CommandList aria-label="Resultados da command palette">
        <CommandEmpty>
          {query.trim().length > 0 ? (
            <button
              type="button"
              className="mx-auto flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm text-primary hover:bg-primary/10"
              onClick={() => {
                markRecent(`nav:ai-ask`);
                navigate(`/nova-solicitacao?q=${encodeURIComponent(query)}`);
                closePalette();
              }}
            >
              Perguntar à IA: <span className="font-medium">"{query}"</span>
            </button>
          ) : (
            <span>Nenhum resultado.</span>
          )}
        </CommandEmpty>

        {query.length === 0 && recentCommands.length > 0 && (
          <>
            <CommandGroup heading="Recentes">
              {recentCommands.map((c) => (
                <CommandItem
                  key={`recent-${c.id}`}
                  value={`recent ${c.title}`}
                  onSelect={() => runCommand(c.id)}
                  className="group"
                >
                  <Berco Icone={c.icon} />
                  <span className="truncate">{c.title}</span>
                  {c.shortcut ? <Tecla>{formatHotkey(c.shortcut)}</Tecla> : null}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {query.length > 0 &&
          searchByType.map(([type, list]) => (
            <CommandGroup key={type} heading={labelForType(type)}>
              {list.map((e) => (
                <CommandItem
                  key={`${type}-${e.id}`}
                  value={`${e.label} ${e.description ?? ""} ${(e.keywords ?? []).join(" ")}`}
                  onSelect={() => handleEntity(e)}
                  className="group"
                >
                  <Berco Icone={e.icon} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{e.label}</span>
                    {e.description ? (
                      <span className="truncate text-[11px] text-muted-foreground">{e.description}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        {query.length > 0 && <CommandSeparator />}

        {groupedByCategory.map(([cat, cmds]) => (
          <CommandGroup key={cat} heading={cat}>
            {cmds.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.title} ${c.description ?? ""} ${(c.keywords ?? []).join(" ")}`}
                onSelect={() => runCommand(c.id)}
                className="group"
              >
                <Berco Icone={c.icon} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{c.title}</span>
                  {c.description ? (
                    <span className="truncate text-[11px] text-muted-foreground">{c.description}</span>
                  ) : null}
                </span>
                {c.shortcut ? <Tecla>{formatHotkey(c.shortcut)}</Tecla> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

function labelForType(type: string): string {
  const map: Record<string, string> = {
    nav: "Páginas",
    solicitacao: "Solicitações",
    solucao: "Soluções",
    atividade: "Atividades",
    usuario: "Usuários",
    sprint: "Sprints",
    projeto: "Projetos",
    artigo: "Artigos",
    automacao: "Automações",
  };
  return map[type] ?? type;
}
