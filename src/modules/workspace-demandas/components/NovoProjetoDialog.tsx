import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadBoardBackground, uploadBoardIcon, isBoardIconUrl } from "@/lib/atividadesBoards";
import { useAuth } from "@/hooks/useAuth";
import type { IdentidadeDoProjeto } from "@/modules/demand-access";

/**
 * Um campo obrigatório, de propósito.
 *
 * O diálogo herdado de Atividades pedia nome, descrição, cor, ícone,
 * visibilidade e favorito antes de deixar criar qualquer coisa — seis decisões
 * para quem só quer um lugar onde colocar trabalho. Aqui o nome é a única coisa
 * exigida; cor e ícone ficam à mão porque o quadradinho do cabeçalho é o que
 * distingue um projeto de outro de longe, e já vêm com um padrão razoável
 * escolhido, então ninguém precisa parar para decidir.
 */

const CORES = [
  "hsl(215 82% 55%)",
  "hsl(160 65% 40%)",
  "hsl(280 55% 55%)",
  "hsl(20 85% 55%)",
  "hsl(0 70% 55%)",
  "hsl(45 90% 50%)",
  "hsl(200 15% 45%)",
];

const ICONES = ["📋", "🚀", "🎯", "💡", "🛠️", "📊", "🧭", "🏗️"];

/**
 * Fundos prontos. São seis porque a decisão é estética e reversível: mais que
 * isso vira catálogo, e catálogo obriga a parar para escolher.
 */
const FUNDOS: { label: string; url: string }[] = [
  { label: "Montanhas ao amanhecer", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80" },
  { label: "Floresta de névoa", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80" },
  { label: "Ondas do oceano", url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80" },
  { label: "Dunas de deserto", url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80" },
  { label: "Gradiente abstrato", url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80" },
  { label: "Aurora noturna", url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80" },
];

const thumb = (url: string) => url.replace("w=1200", "w=200");

export function NovoProjetoDialog({
  open,
  onOpenChange,
  salvando,
  onCriar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salvando?: boolean;
  onCriar: (nome: string, identidade: IdentidadeDoProjeto) => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState<string>(CORES[0]);
  const [icone, setIcone] = useState<string>(ICONES[0]);
  const [fundo, setFundo] = useState<string | null>(null);
  /** Fundo enviado pelo usuário nesta sessão — vira uma miniatura ao lado das prontas. */
  const [fundoEnviado, setFundoEnviado] = useState<string | null>(null);
  /** Ícone enviado pelo usuário nesta sessão — mesma ideia dos fundos. */
  const [iconeEnviado, setIconeEnviado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviandoIcone, setEnviandoIcone] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const arquivoIconeRef = useRef<HTMLInputElement>(null);

  // Reabrir com o texto da tentativa anterior confunde: parece que já existe
  // algo salvo. Zera ao fechar.
  useEffect(() => {
    if (!open) {
      setNome("");
      setCor(CORES[0]);
      setIcone(ICONES[0]);
      setFundo(null);
      setFundoEnviado(null);
      setIconeEnviado(null);
      setEnviando(false);
      setEnviandoIcone(false);
    }
  }, [open]);

  const valido = nome.trim().length > 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || salvando || enviando || enviandoIcone) return;
    await onCriar(nome.trim(), { cor, icone, background: fundo });
  }

  async function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!user?.id) {
      toast.error("Entre novamente para enviar imagens.");
      return;
    }
    setEnviando(true);
    try {
      const url = await uploadBoardBackground(file, user.id);
      setFundoEnviado(url);
      setFundo(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  async function escolherIcone(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!user?.id) {
      toast.error("Entre novamente para enviar imagens.");
      return;
    }
    setEnviandoIcone(true);
    try {
      const url = await uploadBoardIcon(file, user.id);
      setIconeEnviado(url);
      setIcone(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o ícone.");
    } finally {
      setEnviandoIcone(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl">
        <form onSubmit={enviar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Criar quadro</DialogTitle>
            <DialogDescription>
              Ele nasce com as colunas A Fazer, Em Andamento e Concluído.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nome-do-quadro">Nome do quadro</Label>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 text-base"
                style={{ backgroundColor: cor }}
              >
                {isBoardIconUrl(icone) ? (
                  <img src={icone} alt="" className="size-full object-cover" />
                ) : (
                  icone
                )}
              </span>
              <Input
                id="nome-do-quadro"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do seu novo quadro..."
                maxLength={80}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  aria-label={`Usar a cor ${c}`}
                  aria-pressed={cor === c}
                  className={cn(
                    "size-6 rounded-md border-2 transition-colors",
                    cor === c ? "border-foreground" : "border-transparent",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fundo</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFundo(null)}
                aria-label="Sem imagem de fundo"
                aria-pressed={fundo === null}
                className={cn(
                  "h-12 w-16 shrink-0 rounded-md border-2 bg-muted text-[10px] text-muted-foreground",
                  fundo === null ? "border-foreground" : "border-transparent",
                  "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                Nenhum
              </button>
              {FUNDOS.map((f) => (
                <button
                  key={f.url}
                  type="button"
                  onClick={() => setFundo(f.url)}
                  aria-label={`Usar o fundo ${f.label}`}
                  aria-pressed={fundo === f.url}
                  className={cn(
                    "h-12 w-16 shrink-0 overflow-hidden rounded-md border-2",
                    fundo === f.url ? "border-foreground" : "border-transparent",
                    "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  <img
                    src={thumb(f.url)}
                    alt={f.label}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </button>
              ))}

              {/* O fundo enviado fica ao lado dos prontos: depois do upload ele
                  é apenas mais uma opção selecionável. */}
              {fundoEnviado && (
                <button
                  type="button"
                  onClick={() => setFundo(fundoEnviado)}
                  aria-label="Usar a imagem enviada"
                  aria-pressed={fundo === fundoEnviado}
                  className={cn(
                    "h-12 w-16 shrink-0 overflow-hidden rounded-md border-2",
                    fundo === fundoEnviado ? "border-foreground" : "border-transparent",
                    "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  <img src={fundoEnviado} alt="Imagem enviada" className="size-full object-cover" />
                </button>
              )}

              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                disabled={enviando}
                aria-label="Enviar imagem de fundo"
                title="Enviar imagem de fundo"
                className={cn(
                  "flex h-12 w-16 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border",
                  "text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress",
                )}
              >
                {enviando ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="size-4" aria-hidden />
                )}
              </button>
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={escolherArquivo}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap items-center gap-1">
              {ICONES.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcone(i)}
                  aria-label={`Usar o ícone ${i}`}
                  aria-pressed={icone === i}
                  className={cn(
                    "size-7 rounded-md border text-sm transition-colors",
                    icone === i ? "border-foreground bg-accent" : "border-border",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  {i}
                </button>
              ))}

              {/* Ícone enviado: depois do upload é só mais uma opção selecionável. */}
              {iconeEnviado && (
                <button
                  type="button"
                  onClick={() => setIcone(iconeEnviado)}
                  aria-label="Usar o ícone enviado"
                  aria-pressed={icone === iconeEnviado}
                  className={cn(
                    "size-7 overflow-hidden rounded-md border transition-colors",
                    icone === iconeEnviado ? "border-foreground" : "border-border",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  <img src={iconeEnviado} alt="Ícone enviado" className="size-full object-cover" />
                </button>
              )}

              <button
                type="button"
                onClick={() => arquivoIconeRef.current?.click()}
                disabled={enviandoIcone}
                aria-label="Enviar ícone personalizado"
                title="Enviar ícone personalizado"
                className={cn(
                  "flex size-7 items-center justify-center rounded-md border border-dashed border-border",
                  "text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress",
                )}
              >
                {enviandoIcone ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="size-3.5" aria-hidden />
                )}
              </button>
              <input
                ref={arquivoIconeRef}
                type="file"
                accept="image/*"
                hidden
                onChange={escolherIcone}
              />
            </div>
          </div>

          <DialogFooter>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!valido || salvando || enviando || enviandoIcone}>
              {salvando ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
