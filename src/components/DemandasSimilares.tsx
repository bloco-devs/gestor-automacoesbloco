import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DataSourceBadge } from "@/components/DataSourceBadge";

interface Similar {
  id: string;
  titulo: string;
  similaridade: number;
  motivo: string;
}

interface Props {
  titulo: string;
  descricao: string;
  excluirId?: string;
  className?: string;
}

function toneFor(s: number): string {
  if (s >= 85) return "bg-destructive/15 text-destructive border-destructive/30";
  if (s >= 70) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function DemandasSimilares({ titulo, descricao, excluirId, className }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const [similares, setSimilares] = useState<Similar[]>([]);

  const podeVerificar = (descricao?.trim().length ?? 0) >= 10;

  async function verificar() {
    if (loading || !podeVerificar) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("demandas-similares", {
        body: { titulo, descricao, excluirId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const lista = Array.isArray(data?.similares) ? (data.similares as Similar[]) : [];
      setSimilares(lista);
      setVerificado(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      const friendly = /429|muitas solicita/i.test(msg)
        ? "Muitas solicitações à IA. Aguarde alguns instantes."
        : msg;
      toast({ title: "Não foi possível verificar similares", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-md border border-border bg-card/40 p-3 space-y-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Demandas parecidas</p>
            <DataSourceBadge source="IA" />
          </div>
          <p className="text-xs text-muted-foreground">
            Aviso opcional para evitar retrabalho — não impede salvar.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={verificar}
          disabled={loading || !podeVerificar}
          aria-label="Verificar demandas similares com IA"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Verificar similares
        </Button>
      </div>

      {verificado && !loading && similares.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma demanda parecida encontrada.
        </p>
      )}

      {similares.length > 0 && (
        <ul className="space-y-2">
          {similares.map((s) => (
            <li
              key={s.id}
              className="rounded-md border border-border bg-background/60 p-2.5 text-sm space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/solicitacao/${s.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline inline-flex items-center gap-1"
                >
                  {s.titulo} <ExternalLink className="size-3" />
                </Link>
                <Badge variant="outline" className={`text-[10px] ${toneFor(s.similaridade)}`}>
                  {s.similaridade}% parecida
                </Badge>
              </div>
              {s.motivo && (
                <p className="text-xs text-muted-foreground leading-snug">{s.motivo}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DemandasSimilares;
