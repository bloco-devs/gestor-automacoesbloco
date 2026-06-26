import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DataSourceBadge } from "@/components/DataSourceBadge";

export function ResumoPipeline() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);

  async function gerar() {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resumo-pipeline", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResumo(typeof data?.resumo === "string" ? data.resumo : "");
      setGeradoEm(typeof data?.gerado_em === "string" ? data.gerado_em : new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      const friendly = /429|muitas solicita/i.test(msg)
        ? "Muitas solicitações à IA. Aguarde alguns instantes."
        : msg;
      toast({ title: "Não foi possível gerar o resumo", description: friendly, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="surface-1">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base">Resumo executivo do pipeline</CardTitle>
            <div className="flex items-center gap-2">
              <DataSourceBadge source="IA" updatedAt={geradoEm ?? undefined} />
              <span className="text-xs text-muted-foreground">Gerado sob demanda.</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={gerar}
            disabled={loading}
            aria-label="Gerar resumo do pipeline com IA"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {resumo ? "Atualizar" : "Gerar resumo"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!resumo && !loading && (
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar resumo" para uma visão geral do pipeline, pontos de atenção e próximos passos.
          </p>
        )}
        {loading && (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Analisando o pipeline…
          </p>
        )}
        {resumo && !loading && (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{resumo}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default ResumoPipeline;
