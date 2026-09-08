import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { usePessoasDoProjeto, type ProjetoNaLista } from "@/modules/demand-access";

/**
 * Concluir um projeto — e dizer quem trabalhou nele.
 *
 * POR QUE PRECISA ESCOLHER PESSOAS
 *
 * Concluir um projeto passa a valer pontos na apuração do ciclo, e ponto vira
 * remuneração. Uma demanda tem responsável (`assigned_to`); projeto não tinha,
 * e escolher alguém automaticamente seria decidir quem recebe dinheiro por
 * conta própria. Então a escolha é explícita aqui, e o banco recusa conclusão
 * sem ninguém.
 *
 * A DIVISÃO APARECE ANTES DE CONFIRMAR
 *
 * Os pontos da classificação são rateados igualmente entre quem for marcado.
 * Quem confirma precisa ver isso na hora de confirmar, não descobrir no
 * fechamento do ciclo. Como a classificação vem depois, o que dá para mostrar
 * agora é a regra e o número de pessoas — a tela de Classificação mostra o
 * valor exato por pessoa quando o ponto existir.
 *
 * A ordem de marcação é preservada: se algum dia os pontos não dividirem
 * exato, o resto vai para o primeiro da lista.
 */
export function ConcluirProjetoDialog({
  projeto,
  onOpenChange,
  onConfirmar,
  salvando,
}: {
  projeto: ProjetoNaLista | null;
  onOpenChange: (aberto: boolean) => void;
  onConfirmar: (responsaveis: string[]) => void;
  salvando: boolean;
}) {
  const { pessoas, carregando, erro } = usePessoasDoProjeto(projeto?.id ?? null);
  // Array, não Set: a ordem de marcação decide quem recebe o resto da divisão.
  const [marcados, setMarcados] = useState<string[]>([]);

  useEffect(() => {
    if (projeto) setMarcados([]);
  }, [projeto?.id, projeto]);

  const alternar = (id: string) =>
    setMarcados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );

  return (
    <Dialog open={!!projeto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir “{projeto?.nome}”?</DialogTitle>
          <DialogDescription>
            Concluir não é arquivar. A partir daqui este projeto entra na apuração do
            ciclo e pode ser classificado como Fácil, Médio ou Difícil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="ds-label text-muted-foreground">
            Quem trabalhou neste projeto
          </p>

          {erro ? (
            <p className="ds-caption text-destructive">{erro.message}</p>
          ) : carregando ? (
            <p className="ds-caption text-muted-foreground">Carregando as pessoas…</p>
          ) : pessoas.length === 0 ? (
            <p className="ds-caption text-muted-foreground">
              Este projeto não tem ninguém na equipe dele. Adicione as pessoas ao
              projeto antes de concluir — sem responsável não há a quem creditar os
              pontos.
            </p>
          ) : (
            <ul className="flex flex-col rounded-md border border-border">
              {pessoas.map((p) => {
                const posicao = marcados.indexOf(p.id);
                return (
                  <li key={p.id} className="border-b border-border/40 last:border-b-0">
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-3 py-2",
                        "transition-colors hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={posicao >= 0}
                        onCheckedChange={() => alternar(p.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="ds-caption block truncate">{p.nome}</span>
                        <span className="ds-label block truncate text-muted-foreground">
                          {p.email}
                        </span>
                      </span>
                      {posicao === 0 && marcados.length > 1 && (
                        <span
                          className="ds-label shrink-0 text-muted-foreground"
                          title="Se os pontos não dividirem exato, o resto vem para esta pessoa."
                        >
                          1º
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {marcados.length > 0 && (
            <p className="ds-caption text-muted-foreground">
              {marcados.length === 1
                ? "Os pontos da classificação vão inteiros para esta pessoa."
                : `Os pontos da classificação serão divididos igualmente entre ${marcados.length} pessoas.`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(marcados)}
            disabled={salvando || marcados.length === 0}
          >
            {salvando ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="mr-1.5 size-4" aria-hidden />
            )}
            Concluir projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
