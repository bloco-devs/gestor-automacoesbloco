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
import { usePlatformContext } from "../providers/PlatformProvider";
import { useGlobalSearch } from "../hooks";
import { formatHotkey } from "../utils/hotkeys";
import type { PlatformCommand, SearchEntity } from "../types";

const MAX_RESULTS_PER_GROUP = 8;

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
                >
                  {c.icon ? <c.icon className="mr-2 h-4 w-4" aria-hidden /> : null}
                  <span>{c.title}</span>
                  {c.shortcut ? (
                    <kbd className="ml-auto text-[10px] text-muted-foreground">
                      {formatHotkey(c.shortcut)}
                    </kbd>
                  ) : null}
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
                >
                  {e.icon ? <e.icon className="mr-2 h-4 w-4" aria-hidden /> : null}
                  <div className="flex flex-col">
                    <span>{e.label}</span>
                    {e.description ? (
                      <span className="text-xs text-muted-foreground">{e.description}</span>
                    ) : null}
                  </div>
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
              >
                {c.icon ? <c.icon className="mr-2 h-4 w-4" aria-hidden /> : null}
                <div className="flex flex-col">
                  <span>{c.title}</span>
                  {c.description ? (
                    <span className="text-xs text-muted-foreground">{c.description}</span>
                  ) : null}
                </div>
                {c.shortcut ? (
                  <kbd className="ml-auto text-[10px] text-muted-foreground">
                    {formatHotkey(c.shortcut)}
                  </kbd>
                ) : null}
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
