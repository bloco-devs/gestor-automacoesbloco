import { memo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { FileText, FileArchive, Film, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { visualizavel, type Genero } from "@/domain/demand";
import type { AnexoExibivel } from "@/modules/demand-access";

/**
 * Anexos como cidadãos de primeira classe.
 *
 * A REGRA: O QUE PODE SER VISTO NÃO EXIGE DOWNLOAD
 * "Um print vale por quarenta mensagens" só é verdade se o print for visto. Um
 * anexo listado como `IMG_4821.png · 2,1 MB · baixar` não vale nada — para
 * ver, a pessoa baixa, abre noutro programa e volta, e na prática ninguém
 * volta. Então imagem aparece como miniatura, vídeo toca na página, PDF e log
 * abrem numa camada sem sair da demanda.
 *
 * O QUE NÃO PODE SER VISTO GANHA NOME E ÍCONE
 * Um `.zip` não tem preview possível. Mostrar um retângulo cinza com um ícone
 * genérico seria pior que mostrar o nome: o nome é a informação que ajuda a
 * decidir se vale abrir.
 *
 * A ORDEM NÃO É CRONOLÓGICA
 * Imagem primeiro. É o anexo com maior densidade de informação por segundo de
 * atenção, e quem abre uma demanda com um print e um zip precisa ver o print
 * sem rolar.
 *
 * COLAR TAMBÉM ANEXA
 * `Ctrl+V` de um print recém-tirado é como a maioria das pessoas manda uma
 * imagem hoje. Exigir "escolher arquivo" é exigir salvar antes — um passo que
 * faz a pessoa desistir e descrever o erro por escrito.
 */

const ICONE: Record<Genero, typeof FileText> = {
  imagem: Paperclip,
  video: Film,
  pdf: FileText,
  log: FileText,
  pacote: FileArchive,
  outro: Paperclip,
};

/**
 * O botão de excluir aparece no hover, sobre o canto da miniatura.
 *
 * Não é sutileza estética: excluir é irreversível e o alvo fica em cima do
 * conteúdo. Visível o tempo todo, num grid de miniaturas pequenas, ele
 * convida ao clique errado — e ninguém desfaz um arquivo apagado.
 *
 * Em toque, onde não existe hover, ele fica sempre visível: esconder um
 * controle atrás de um gesto que o aparelho não tem seria pior que o risco.
 */
function BotaoExcluir({
  nome,
  excluindo,
  onExcluir,
}: {
  nome: string;
  excluindo: boolean;
  onExcluir: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={excluindo}
          aria-label={`Excluir ${nome}`}
          title="Excluir anexo"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-1 top-1 z-10 inline-flex size-6 items-center justify-center rounded-md",
            "bg-background/85 text-muted-foreground backdrop-blur-sm ring-1 ring-border",
            "transition-all hover:bg-destructive hover:text-destructive-foreground hover:ring-destructive",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            "[@media(hover:none)]:opacity-100",
          )}
        >
          {excluindo ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-3" aria-hidden />
          )}
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este anexo?</AlertDialogTitle>
          {/* O nome do arquivo na pergunta, não só "este anexo". Num grid de
              miniaturas parecidas, é o que evita apagar a errada. */}
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{nome}</span> será removido da demanda e
            do armazenamento. Não há como desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onExcluir}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Ficha({
  anexo: a,
  onAbrir,
  onExcluir,
  excluindo,
}: {
  anexo: AnexoExibivel;
  onAbrir: (a: AnexoExibivel) => void;
  onExcluir?: (a: AnexoExibivel) => void;
  excluindo: boolean;
}) {
  const Icone = ICONE[a.genero];

  const excluir = onExcluir ? (
    <BotaoExcluir nome={a.nome} excluindo={excluindo} onExcluir={() => onExcluir(a)} />
  ) : null;

  if (a.genero === "imagem" && a.url) {
    return (
      <div className="group relative">
        <button
          type="button"
          onClick={() => onAbrir(a)}
          title={a.nome}
          className="block aspect-[4/3] w-full overflow-hidden rounded-md border border-border/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <img
            src={a.url}
            alt={a.nome}
            loading="lazy"
            className="size-full object-cover transition-transform duration-base group-hover:scale-[1.03]"
          />
        </button>
        {excluir}
      </div>
    );
  }

  if (a.genero === "video" && a.url) {
    return (
      <div className="group relative">
        <video
          src={a.url}
          controls
          preload="metadata"
          aria-label={a.nome}
          className="aspect-[4/3] w-full rounded-md border border-border/60 bg-black object-contain"
        />
        {excluir}
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onAbrir(a)}
        disabled={!a.url}
        title={a.nome}
        className={cn(
          "flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-md border border-border/60 px-2",
          "transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:opacity-50",
        )}
      >
        <Icone className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="line-clamp-2 break-all text-center text-[11px] leading-tight text-muted-foreground">
          {a.nome}
        </span>
      </button>
      {excluir}
    </div>
  );
}

interface Props {
  anexos: AnexoExibivel[];
  podeAnexar: boolean;
  enviando: boolean;
  onEnviar: (arquivos: File[]) => void;
  /** Ausente quando a origem da demanda não permite excluir — aí o botão não
   *  aparece, em vez de aparecer e falhar. */
  onExcluir?: (anexo: AnexoExibivel) => void;
  /** Id do anexo em exclusão, para o giro ficar na linha certa. */
  excluindo?: string | null;
}

function AnexosImpl({ anexos, podeAnexar, enviando, onEnviar, onExcluir, excluindo }: Props) {
  const [aberto, setAberto] = useState<AnexoExibivel | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  if (anexos.length === 0 && !podeAnexar) return null;

  return (
    <section
      aria-label="Anexos"
      onDragOver={(e) => {
        if (!podeAnexar) return;
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        if (!podeAnexar) return;
        e.preventDefault();
        setArrastando(false);
        onEnviar([...e.dataTransfer.files]);
      }}
      onPaste={(e) => {
        if (!podeAnexar) return;
        const arquivos = [...e.clipboardData.files];
        if (arquivos.length > 0) onEnviar(arquivos);
      }}
      className={cn(
        "border-b border-border/50 px-4 py-3 transition-colors",
        arrastando && "bg-primary/5 ring-1 ring-inset ring-primary/40",
      )}
    >
      <div className="flex items-baseline gap-2">
        <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">Anexos</h3>
        {anexos.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">{anexos.length}</span>
        )}
        {enviando && <Loader2 className="size-3 animate-spin text-muted-foreground" aria-label="Enviando" />}
      </div>

      {anexos.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {anexos.map((a) => (
            <Ficha
              key={a.id}
              anexo={a}
              onAbrir={setAberto}
              onExcluir={onExcluir}
              excluindo={excluindo === a.id}
            />
          ))}
        </div>
      )}

      {podeAnexar && (
        <>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-2 flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Upload className="size-3" aria-hidden />
            Anexar — ou arraste, ou cole um print
          </button>
          <input
            ref={input}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              onEnviar([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </>
      )}

      {/* A camada de visualização não tira a pessoa da demanda: fecha com Esc e
          devolve exatamente o mesmo contexto. Abrir noutra aba perderia o fio. */}
      <Dialog open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <DialogContent className="max-w-5xl p-0">
          <DialogTitle className="sr-only">{aberto?.nome ?? "Anexo"}</DialogTitle>
          {aberto?.url && visualizavel(aberto.genero) ? (
            aberto.genero === "imagem" ? (
              <img src={aberto.url} alt={aberto.nome} className="max-h-[80vh] w-full object-contain" />
            ) : (
              <iframe src={aberto.url} title={aberto.nome} className="h-[80vh] w-full rounded-md bg-background" />
            )
          ) : (
            <div className="p-8 text-center">
              <p className="text-[13px]">{aberto?.nome}</p>
              {aberto?.url && (
                <a
                  href={aberto.url}
                  download={aberto.nome}
                  className="mt-2 inline-block text-[13px] text-primary underline"
                >
                  Baixar
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export const Anexos = memo(AnexosImpl);
