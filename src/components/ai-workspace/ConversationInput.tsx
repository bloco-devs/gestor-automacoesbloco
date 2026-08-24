import { DragEvent, KeyboardEvent, memo, useEffect, useRef, useState } from "react";
import { SendHorizontal, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ACEITA_NO_SELETOR } from "@/modules/demands/anexos";
import type { AnexoDeRascunho } from "@/modules/demand-access";

/**
 * A barra de input da conversa — agora com anexo.
 *
 * POR QUE O CLIPE NASCEU AQUI E NÃO NA TELA DA DEMANDA
 * Ele já existe na tela da demanda. O problema é que a pessoa chega lá depois:
 * ela conversa com a IA COM o print na mão, no segundo em que encontrou o erro,
 * e a tela onde poderia entregá-lo só aparece quando o problema já passou. Foi
 * por isso que o prompt do assistente teve que ser proibido de pedir print —
 * pedir o que a tela não aceita é pior que não pedir. O clipe aqui desfaz essa
 * proibição: o pedido volta a ser possível de atender.
 *
 * TRÊS GESTOS, NÃO UM
 * Clicar, arrastar e colar. Colar é o que mais importa: `Print Screen` seguido
 * de `Ctrl+V` é como a maioria das pessoas manda uma imagem, e exigir "salvar
 * como" antes é o passo em que se desiste. É a mesma decisão já tomada em
 * `Anexos.tsx`, pelo mesmo motivo — e ela é repetida aqui de propósito, para
 * que os dois lugares onde se anexa se comportem igual.
 *
 * AS PROPRIEDADES DE ANEXO SÃO OPCIONAIS
 * `PortalQuickCreate` e `Portal` usam esta mesma barra para abrir a conversa, e
 * lá ainda não há sessão de rascunho. Sem `onAnexar`, o clipe simplesmente não
 * existe — nenhum botão que não faz nada.
 */

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  /** Presente = a barra aceita anexo. Ausente = o clipe nem aparece. */
  onAnexar?: (arquivos: File[]) => void;
  anexos?: AnexoDeRascunho[];
  onRemoverAnexo?: (id: string) => void;
  enviandoAnexo?: boolean;
}

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const ConversationInput = memo(function ConversationInput({
  onSend,
  disabled,
  loading,
  placeholder = "Descreva sua demanda ou tire uma dúvida…",
  autoFocus = true,
  onAnexar,
  anexos = [],
  onRemoverAnexo,
  enviandoAnexo = false,
}: Props) {
  const [value, setValue] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const seletor = useRef<HTMLInputElement>(null);
  const aceitaAnexo = !!onAnexar;

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue("");
    ref.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function receber(lista: FileList | File[] | null) {
    if (!onAnexar || !lista) return;
    const arquivos = [...lista];
    if (arquivos.length > 0) onAnexar(arquivos);
  }

  function aoArrastar(e: DragEvent<HTMLDivElement>) {
    if (!aceitaAnexo) return;
    e.preventDefault();
    setArrastando(true);
  }

  return (
    <div
      onDragOver={aoArrastar}
      onDragEnter={aoArrastar}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        if (!aceitaAnexo) return;
        e.preventDefault();
        setArrastando(false);
        receber(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-2.5 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary",
        arrastando && "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      {/* As fichas ficam ACIMA do campo, e não abaixo do botão de enviar: o que
          já foi anexado é contexto da mensagem que está sendo escrita, e
          contexto se lê antes. */}
      {anexos.length > 0 && (
        <ul className="mb-1.5 flex flex-wrap gap-1.5 px-1" aria-label="Arquivos anexados à conversa">
          {anexos.map((a) => (
            <li
              key={a.id}
              className="flex max-w-[15rem] items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 py-1 pl-2 pr-1 text-[12px]"
            >
              <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate" title={a.nome}>
                {a.nome}
              </span>
              <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                {tamanhoLegivel(a.tamanho)}
              </span>
              {onRemoverAnexo && (
                <button
                  type="button"
                  onClick={() => onRemoverAnexo(a.id)}
                  aria-label={`Remover ${a.nome}`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="size-3" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        {aceitaAnexo && (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => seletor.current?.click()}
              disabled={disabled || enviandoAnexo}
              aria-label="Anexar arquivo"
              title="Anexar print, foto ou PDF — ou arraste, ou cole"
              className="size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
            >
              {enviandoAnexo ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </Button>
            <input
              ref={seletor}
              type="file"
              multiple
              accept={ACEITA_NO_SELETOR}
              className="sr-only"
              onChange={(e) => {
                receber(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}

        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            // Só intercepta quando há arquivo: colar texto continua sendo colar
            // texto, sem `preventDefault` e sem surpresa.
            if (!aceitaAnexo) return;
            const arquivos = [...e.clipboardData.files];
            if (arquivos.length > 0) {
              e.preventDefault();
              receber(arquivos);
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          aria-label="Mensagem para a IA"
          className="min-h-[44px] max-h-40 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
        />

        <Button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Enviar mensagem"
          className="h-10 px-4 shrink-0 rounded-xl gap-2 font-semibold shadow-xs"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <SendHorizontal className="size-4" />
              <span className="hidden sm:inline">Enviar</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
});
