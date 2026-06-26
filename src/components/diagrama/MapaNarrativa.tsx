import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface MapaNarrativaPayload {
  solucoes: Array<{ titulo: string; solicitacaoTitulo?: string | null }>;
  conexoes: Array<{
    origem: string;
    destino: string;
    label?: string | null;
    colunas?: Array<{ nome: string; tipo: string }>;
  }>;
}

interface Props {
  /** Função sob demanda que monta o payload a partir do estado atual do diagrama. */
  buildPayload: () => MapaNarrativaPayload;
  disabled?: boolean;
}

export function MapaNarrativa({ buildPayload, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [narrativa, setNarrativa] = useState<string>("");
  const [geradoEm, setGeradoEm] = useState<string | undefined>(undefined);

  const handleGerar = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const payload = buildPayload();
      const { data, error } = await supabase.functions.invoke("mapa-narrativa", {
        body: payload,
      });
      if (error) {
        // Status custom: invoke não expõe status diretamente; tentamos extrair da msg.
        const msg = error.message || "";
        if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
          toast({
            title: "Limite de uso da IA atingido",
            description: "Aguarde alguns instantes e tente novamente.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Não foi possível gerar a narrativa",
            description: msg || "Tente novamente em instantes.",
            variant: "destructive",
          });
        }
        return;
      }
      const result = data as { narrativa?: string; gerado_em?: string; error?: string };
      if (result?.error) {
        toast({
          title: "Erro ao gerar narrativa",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      setNarrativa(result?.narrativa ?? "");
      setGeradoEm(result?.gerado_em);
    } catch (err) {
      console.error("mapa-narrativa", err);
      toast({
        title: "Falha de rede ao chamar a IA",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGerar}
        disabled={disabled || loading}
        aria-label="Explicar mapa com IA"
      >
        {loading ? (
          <Loader2 className="size-4 mr-1 animate-spin" />
        ) : (
          <Sparkles className="size-4 mr-1" />
        )}
        Explicar com IA
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Narrativa do mapa
            </SheetTitle>
            <SheetDescription>
              Explicação gerada por IA a partir do diagrama atual (read-only).
            </SheetDescription>
            <div className="pt-1">
              <DataSourceBadge source="IA" updatedAt={geradoEm} />
            </div>
          </SheetHeader>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="size-4 animate-spin" />
                Gerando narrativa...
              </div>
            ) : narrativa ? (
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {narrativa}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic py-4">
                Sem narrativa disponível.
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleGerar} disabled={loading}>
              {loading ? "Gerando..." : "Regerar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default MapaNarrativa;
