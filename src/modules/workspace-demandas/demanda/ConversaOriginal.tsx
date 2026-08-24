import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, MessagesSquare, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/**
 * A conversa que originou a demanda.
 *
 * POR QUE ELA APARECE AQUI, E NÃO NO FIO
 *
 * O fio é o que aconteceu DEPOIS que a demanda existe: respostas, mudanças de
 * status, anexos. Isto é o que aconteceu ANTES — e misturar as duas coisas
 * numa linha do tempo só faria a origem se perder no meio.
 *
 * POR QUE ELA APARECE
 *
 * `description` guarda o que o Blink escreveu. Isto é o que a pessoa disse.
 * Quando as duas divergem, é aqui que se descobre — e antes de existir, a
 * divergência só aparecia depois da entrega pronta, quando o custo já estava
 * pago e a culpa caía em quem construiu.
 *
 * FECHADA POR PADRÃO
 *
 * Ela não é a informação do dia a dia: quem já entendeu a demanda não precisa
 * reler a origem toda vez. Mas ela precisa estar a UM clique — um registro
 * que dá trabalho encontrar é um registro que ninguém consulta na hora da
 * dúvida, e a hora da dúvida é o único momento em que ele importa.
 */

interface Mensagem {
  id: string;
  ordem: number;
  papel: "solicitante" | "blink";
  texto: string;
}

function ConversaOriginalImpl({ demandaId }: { demandaId: string | null }) {
  const [aberta, setAberta] = useState(false);

  const consulta = useQuery({
    queryKey: ["demanda", demandaId, "conversa"],
    enabled: !!demandaId,
    // A conversa é imutável por desenho — não há por que revalidar.
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demanda_conversa" as never)
        .select("id, ordem, papel, texto")
        .eq("demanda_id", demandaId as string)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as Mensagem[];
    },
  });

  const mensagens = consulta.data ?? [];

  // Demanda aberta por formulário não tem conversa, e isso não é falta — é
  // outra origem. Uma seção vazia dizendo "sem conversa" seria ruído em toda
  // demanda do portal.
  if (!consulta.isLoading && mensagens.length === 0) return null;

  const doSolicitante = mensagens.filter((m) => m.papel === "solicitante").length;

  return (
    <section aria-label="Conversa original" className="border-b border-border/50 px-4 py-3">
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        className="flex w-full items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {aberta ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <MessagesSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Como foi pedido
        </h3>
        {!aberta && doSolicitante > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {doSolicitante} {doSolicitante === 1 ? "mensagem" : "mensagens"} de quem abriu
          </span>
        )}
      </button>

      {aberta && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            As palavras de quem pediu, sem edição. A descrição da demanda é a
            versão que o Blink escreveu a partir daqui — se as duas divergirem,
            esta é a que vale.
          </p>

          {consulta.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            mensagens.map((m) => (
              <div key={m.id} className="flex gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold",
                    m.papel === "blink"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {m.papel === "blink" ? <Sparkles className="size-3" /> : "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="ds-label text-muted-foreground">
                    {m.papel === "blink" ? "Blink" : "Quem pediu"}
                  </span>
                  {/* `whitespace-pre-wrap` porque a quebra de linha que a pessoa
                      escreveu faz parte do que ela disse. Reformatar o texto de
                      um testemunho é uma forma pequena de reescrevê-lo. */}
                  <p
                    className={cn(
                      "mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed",
                      m.papel === "blink" && "text-muted-foreground",
                    )}
                  >
                    {m.texto}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export const ConversaOriginal = memo(ConversaOriginalImpl);
