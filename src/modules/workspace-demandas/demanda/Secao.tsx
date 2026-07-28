import { memo, useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Uma seção que se abre — e lembra que foi aberta.
 *
 * POR QUE COLAPSÁVEL, E NÃO SÓ MENOR
 * A coluna de detalhes mostrava onze campos, anexos, critérios e descrição de
 * uma vez. Encolher tudo não resolveria: continuariam onze coisas disputando
 * atenção, só que menores. O que resolve é assumir que a maioria delas é
 * consulta, não leitura — ninguém abre uma demanda para conferir a data de
 * abertura, mas todo mundo precisa dela eventualmente.
 *
 * A CONTAGEM NO RÓTULO É O PONTO
 * "Anexos" obriga a abrir para descobrir se há algo lá. "Anexos 2" responde
 * sem custo, e "Anexos" sem número diz que está vazio — que também é
 * resposta. Sem isso, seção fechada vira caixa-preta e a pessoa abre todas
 * por precaução, voltando ao problema original.
 *
 * O ESTADO PERSISTE POR SEÇÃO, NÃO POR DEMANDA
 * Quem trabalha com critérios abertos quer isso em toda demanda, não só na
 * que estava aberta quando escolheu. A chave é o nome da seção.
 */
export const Secao = memo(function Secao({
  id,
  titulo,
  contagem,
  padraoAberto = false,
  acao,
  children,
}: {
  /** Identidade estável para lembrar o estado. Não use o id da demanda. */
  id: string;
  titulo: string;
  /** Aparece ao lado do título. Omita quando contar não fizer sentido. */
  contagem?: number | string | null;
  padraoAberto?: boolean;
  /** Canto direito do cabeçalho — ex.: "0/2" dos critérios. */
  acao?: ReactNode;
  children: ReactNode;
}) {
  const chave = `demanda:secao:${id}`;
  const [aberto, setAberto] = useState<boolean>(() => {
    if (typeof window === "undefined") return padraoAberto;
    const guardado = window.localStorage.getItem(chave);
    return guardado === null ? padraoAberto : guardado === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(chave, aberto ? "1" : "0");
  }, [chave, aberto]);

  const alternar = useCallback(() => setAberto((v) => !v), []);
  const painelId = `secao-${id}`;

  return (
    <section className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={painelId}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors",
          "hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/50",
        )}
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard",
            aberto && "rotate-90",
          )}
          aria-hidden
        />
        <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
          {titulo}
        </span>
        {contagem !== null && contagem !== undefined && contagem !== 0 && (
          <span className="text-[12px] tabular-nums text-muted-foreground/70">{contagem}</span>
        )}
        {acao && <span className="ml-auto shrink-0">{acao}</span>}
      </button>

      {/* Altura animada por grid: transita sem precisar medir o conteúdo, e
          sem o salto que `max-height` chutado produz quando erra o tamanho. */}
      <div
        id={painelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-base ease-standard",
          aberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-3.5">{children}</div>
        </div>
      </div>
    </section>
  );
});
