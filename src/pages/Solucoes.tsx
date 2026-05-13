import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Sparkles, Trash } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  createSolucao,
  deleteSolucao,
  listSolicitacoes,
  listSolucoes,
} from "@/lib/supabaseData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Solucoes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const solucoes = useSupabaseData(() => listSolucoes(), []);
  const solicitacoes = useSupabaseData(() => listSolicitacoes(), []);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

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
        createdBy: user?.id,
        solicitacaoId: null,
      });
      setNovoTitulo("");
      setNovoDescricao("");
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
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="size-5 text-accent" /> Soluções desenvolvidas
          </h1>
          <p className="text-sm text-muted-foreground">Catálogo de entregas vinculadas às demandas.</p>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-4" /> Solução avulsa
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <div>
              <p className="text-sm font-medium">Cadastrar solução avulsa</p>
              <p className="text-xs text-muted-foreground">Sem vínculo com uma demanda.</p>
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
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCriarSolucao} disabled={salvando}>
                {salvando ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {solucoes.length === 0 ? (
        <Card className="surface-1">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma solução cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {solucoes.map((s) => (
            <SolucaoCard
              key={s.id}
              id={s.id}
              titulo={s.titulo}
              descricao={s.descricao}
              demandaTitulo={solicitacoes.find((item) => item.id === s.solicitacaoId)?.titulo}
              onDeleteSolucao={async () => {
                try {
                  await deleteSolucao(s.id);
                  toast({ title: "Solução excluída", description: "Removida também da demanda vinculada." });
                } catch (err) {
                  toast({
                    title: "Erro ao excluir",
                    description: err instanceof Error ? err.message : "Tente novamente.",
                    variant: "destructive",
                  });
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SolucaoCard({
  id,
  titulo,
  descricao,
  demandaTitulo,
  onDeleteSolucao,
}: {
  id: string;
  titulo: string;
  descricao: string;
  demandaTitulo?: string;
  onDeleteSolucao: () => void;
}) {
  const navigate = useNavigate();
  const open = () => navigate(`/solucoes/${id}`);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Card
      className="surface-1 cursor-pointer hover:border-accent/50 transition-colors"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base">{titulo}</CardTitle>
            {demandaTitulo && <CardDescription>{demandaTitulo}</CardDescription>}
          </div>
          <div className="flex items-center gap-2" onClick={stop} onKeyDown={stop}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Excluir solução">
                  <Trash className="size-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir esta solução?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá a solução da demanda vinculada. Não é possível desfazer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteSolucao}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {descricao && <p className="text-sm text-muted-foreground mt-2">{descricao}</p>}
      </CardHeader>
    </Card>
  );
}
