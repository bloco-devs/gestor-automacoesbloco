import { KeyboardEvent, memo, useEffect, useRef, useState } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export const ConversationInput = memo(function ConversationInput({
  onSend,
  disabled,
  loading,
  placeholder = "Descreva sua demanda ou tire uma dúvida…",
  autoFocus = true,
}: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        aria-label="Mensagem para a IA"
        className="min-h-[44px] max-h-40 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        size="icon"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Enviar mensagem"
        className="size-10 shrink-0 rounded-xl"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
      </Button>
    </div>
  );
});
