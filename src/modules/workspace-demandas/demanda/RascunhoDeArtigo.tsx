import { memo, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RascunhoDeArtigo as Rascunho } from "@/domain/knowledge";

/**
 * O rascunho de artigo, pronto para uma pessoa aprovar.
 *
 * A REGRA QUE ESTA TELA EXISTE PARA GARANTIR
 * Nenhum artigo é criado automaticamente. O sistema monta; quem publica é
 * gente. Uma base que se publica sozinha vira uma base em que ninguém confia —
 * e base sem confiança é pior que base nenhuma, porque consome as buscas sem
 * resolver.
 *
 * POR QUE OS CAMPOS SÃO EDITÁVEIS AQUI, E NÃO NO PREVIEW DA CRIAÇÃO
 * São públicos diferentes. Quem abre uma demanda descreve um problema e não
 * deve preencher formulário — por isso lá a correção é falar de novo. Aqui
 * quem está aprovando é da equipe, vai assinar o artigo, e precisa poder
 * ajustar a frase antes de ela ganhar autoridade de documentação publicada.
 *
 * A COMPLETUDE APARECE COMO FRASE, NÃO COMO PORCENTAGEM
 * "62% completo" é informação para quem calibra o sistema. "Falta descrever a
 * solução" é informação para quem vai aprovar — e é a ação, não a métrica.
 */

interface Props {
  rascunho: Rascunho;
  aberto: boolean;
  onFechar: () => void;
  onPublicar: (r: Rascunho) => Promise<void>;
}

function Campo({
  rotulo,
  children,
  falta,
}: {
  rotulo: string;
  children: React.ReactNode;
  falta?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-baseline gap-2 text-[12px] text-muted-foreground">
        {rotulo}
        {falta && <span className="text-warning">falta preencher</span>}
      </label>
      {children}
    </div>
  );
}

function RascunhoDeArtigoImpl({ rascunho, aberto, onFechar, onPublicar }: Props) {
  const [r, setR] = useState<Rascunho>(rascunho);
  const [publicando, setPublicando] = useState(false);

  const semSolucao = r.solucao.join("").trim().length < 15;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <BookOpen className="size-4 text-primary" aria-hidden />
            Rascunho de artigo
          </DialogTitle>
        </DialogHeader>

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Montado a partir desta demanda. Nada foi publicado — confira, ajuste o que for preciso e publique.
        </p>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          <Campo rotulo="Título">
            <Input
              value={r.titulo}
              onChange={(e) => setR({ ...r, titulo: e.target.value })}
              className="text-[13px]"
            />
          </Campo>

          <Campo rotulo="Problema">
            <Textarea
              value={r.problema}
              onChange={(e) => setR({ ...r, problema: e.target.value })}
              className="min-h-[60px] resize-none text-[13px]"
            />
          </Campo>

          {r.sintomas.length > 0 && (
            <Campo rotulo="Como se manifesta">
              <Textarea
                value={r.sintomas.join("\n")}
                onChange={(e) => setR({ ...r, sintomas: e.target.value.split("\n") })}
                className="min-h-[60px] resize-none text-[13px]"
              />
            </Campo>
          )}

          <Campo rotulo="Solução aplicada" falta={semSolucao}>
            <Textarea
              value={r.solucao.join("\n")}
              onChange={(e) => setR({ ...r, solucao: e.target.value.split("\n") })}
              placeholder="O que de fato resolveu."
              className={cn("min-h-[90px] resize-none text-[13px]", semSolucao && "border-warning/60")}
            />
          </Campo>

          {r.comoVerificar.length > 0 && (
            <Campo rotulo="Como verificar">
              <Textarea
                value={r.comoVerificar.join("\n")}
                onChange={(e) => setR({ ...r, comoVerificar: e.target.value.split("\n") })}
                className="min-h-[60px] resize-none text-[13px]"
              />
            </Campo>
          )}

          <Campo rotulo="Palavras de busca">
            <Input
              value={r.termos.join(", ")}
              onChange={(e) => setR({ ...r, termos: e.target.value.split(",").map((t) => t.trim()) })}
              className="text-[13px]"
            />
          </Campo>
        </div>

        <DialogFooter className="flex-row items-center gap-2 sm:justify-start">
          <Button
            disabled={publicando || semSolucao}
            onClick={async () => {
              setPublicando(true);
              try {
                await onPublicar(r);
              } finally {
                setPublicando(false);
              }
            }}
            className="gap-2"
          >
            {publicando && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Publicar na base
          </Button>
          <Button variant="ghost" onClick={onFechar} disabled={publicando}>
            Agora não
          </Button>
          {/* Bloquear a publicação sem solução é deliberado: artigo sem a parte
              que resolve ocupa a busca e devolve a pessoa ao ponto de partida. */}
          {semSolucao && (
            <span className="text-[12px] text-muted-foreground">
              Descreva a solução antes de publicar.
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const RascunhoDeArtigo = memo(RascunhoDeArtigoImpl);
