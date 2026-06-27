import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, ChevronsUpDown, ExternalLink, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { createSolucao, listSolicitacoes, listSolucoes } from "@/lib/supabaseData";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SEM_SOLICITACAO_KEY = "__sem__";

export default function SolucoesKanban() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: solucoesData, loading, error, refetch } = useSupabaseQuery(() => listSolucoes(), []);
  const solucoes = solucoesData ?? [];
  const solicitacoes = useSupabaseData(() => listSolicitacoes(), []);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoLink, setNovoLink] = useState("");
  const [novoSolicitacaoId, setNovoSolicitacaoId] = useState<string>("none");
  const [salvando, setSalvando] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  // Toggle entre as duas variantes do seletor de vínculo (A: combobox / B: modal com busca)
  const [vinculoVariant, setVinculoVariant] = useState<"A" | "B">("A");
  const [comboOpen, setComboOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSearch, setDialogSearch] = useState("");

  const solicitacoesMap = useMemo(() => {
    const m = new Map(solicitacoes.map((s) => [s.id, s]));
    return m;
  }, [solicitacoes]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof solucoes>();
    for (const sol of solucoes) {
      const key = sol.solicitacaoId ?? SEM_SOLICITACAO_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sol);
    }
    // Order: solicitações com soluções primeiro (por created_at desc), "sem" no fim
    const orderedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === SEM_SOLICITACAO_KEY) return 1;
      if (b === SEM_SOLICITACAO_KEY) return -1;
      const sa = solicitacoesMap.get(a);
      const sb = solicitacoesMap.get(b);
      const ta = sa ? new Date(sa.createdAt).getTime() : 0;
      const tb = sb ? new Date(sb.createdAt).getTime() : 0;
      return tb - ta;
    });
    return orderedKeys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [solucoes, solicitacoesMap]);

  const handleCriarSolucao = async () => {
    if (!novoTitulo.trim()) {
      toast({ title: "Informe um título", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      await createSolucao({
        titulo: novoTitulo.trim(),
        descricao: novoDescricao.trim(),
        link: novoLink.trim() || null,
        createdBy: user?.id,
        solicitacaoId: novoSolicitacaoId === "none" ? null : novoSolicitacaoId,
      });
      setNovoTitulo("");
      setNovoDescricao("");
      setNovoLink("");
      setNovoSolicitacaoId("none");
      setPopoverOpen(false);
      toast({ title: "Solução cadastrada" });
    } catch (err) {
      toast({
        title: "Erro ao cadastrar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kanban de Soluções</h1>
          <p className="text-sm text-muted-foreground">
            Soluções agrupadas pela solicitação que as originou.
          </p>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-4" /> Cadastrar solução
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3 max-h-[80vh] overflow-y-auto">
            <div>
              <p className="text-sm font-medium">Cadastrar solução</p>
              <p className="text-xs text-muted-foreground">Vincule a uma solicitação existente, se desejar.</p>
            </div>
            <Input
              placeholder="Título da solução"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={novoDescricao}
              onChange={(e) => setNovoDescricao(e.target.value)}
              rows={3}
            />
            <Input
              placeholder="Link (opcional, ex: https://...)"
              value={novoLink}
              onChange={(e) => setNovoLink(e.target.value)}
            />
            {(() => {
              const selectedTitulo = novoSolicitacaoId === "none"
                ? null
                : solicitacoesMap.get(novoSolicitacaoId)?.titulo ?? null;
              const triggerLabel = selectedTitulo ?? "Vincular a uma solicitação (opcional)";
              return (
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        !selectedTitulo && "text-muted-foreground",
                      )}
                    >
                      <span className="truncate">{triggerLabel}</span>
                      <ChevronsUpDown className="size-4 opacity-50 shrink-0 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="bottom"
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar solicitação..." className="h-8 text-xs" />
                      <CommandList className="max-h-28">
                        <CommandEmpty className="py-2 text-xs">Nenhuma solicitação encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="sem vínculo"
                            className="py-1 text-xs"
                            onSelect={() => {
                              setNovoSolicitacaoId("none");
                              setComboOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 size-3", novoSolicitacaoId === "none" ? "opacity-100" : "opacity-0")} />
                            Sem vínculo
                          </CommandItem>
                          {solicitacoes.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.titulo}
                              className="py-1 text-xs"
                              onSelect={() => {
                                setNovoSolicitacaoId(s.id);
                                setComboOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 size-3 shrink-0", novoSolicitacaoId === s.id ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{s.titulo}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              );
            })()}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCriarSolucao} disabled={salvando}>
                {salvando ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="surface-1">
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={refetch}>
              Tentar novamente
            </Button>
          }
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhuma solução cadastrada ainda"
          description="Cadastre a primeira solução no botão acima."
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {grouped.map(({ key, items }) => {
            const solic = key === SEM_SOLICITACAO_KEY ? null : solicitacoesMap.get(key);
            const title = solic?.titulo ?? "Sem solicitação vinculada";
            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border bg-card p-3 flex flex-col min-h-[200px]",
                  key === SEM_SOLICITACAO_KEY ? "border-dashed border-muted" : "border-border",
                )}
              >
                <div className="mb-3 px-1">
                  <button
                    type="button"
                    onClick={() => solic && navigate(`/solicitacao/${solic.id}`)}
                    disabled={!solic}
                    className={cn(
                      "block w-full text-left text-sm font-medium leading-snug truncate",
                      solic && "hover:text-accent",
                    )}
                  >
                    {title}
                  </button>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {items.length} solução{items.length === 1 ? "" : "ões"}
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {items.map((sol) => (
                    <div
                      key={sol.id}
                      onClick={() => navigate(`/solucoes/${sol.id}`)}
                      className="rounded-md border border-border bg-background p-3 cursor-pointer transition-shadow hover:border-accent/50 hover:shadow-sm"
                    >
                      <div className="text-sm font-medium leading-snug line-clamp-2">{sol.titulo}</div>
                      {sol.descricao && (
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {sol.descricao}
                        </div>
                      )}
                      {sol.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(sol.link!, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="size-3 mr-1" />
                          Abrir link
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
