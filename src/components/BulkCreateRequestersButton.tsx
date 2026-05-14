import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Result = {
  email: string;
  password?: string;
  nome?: string;
  status: "created" | "skipped_existing" | "error";
  error?: string;
};

export function BulkCreateRequestersButton() {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const { toast } = useToast();

  async function handleClick() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "bulk-create-requesters",
        { method: "POST" },
      );
      if (error) throw error;
      setResults((data as { results: Result[] }).results);
      setOpen(true);
    } catch (e) {
      toast({
        title: "Falha ao criar usuários",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const formatted = results
    .map((r) =>
      r.status === "created"
        ? `${r.email}\t${r.password}`
        : `${r.email}\t[${r.status}${r.error ? `: ${r.error}` : ""}]`,
    )
    .join("\n");

  return (
    <>
      <Button onClick={handleClick} disabled={loading} variant="outline">
        <UserPlus className="size-4" />
        {loading ? "Criando..." : "Criar solicitantes em lote"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultado da criação</DialogTitle>
            <DialogDescription>
              Salve esta lista agora — as senhas só aparecem uma vez.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded border bg-muted p-3">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {formatted}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(formatted);
                toast({ title: "Copiado para a área de transferência" });
              }}
            >
              <Copy className="size-4" /> Copiar tudo
            </Button>
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
