import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Star, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyPanel } from "@/design-system";
import { cn } from "@/lib/utils";
import { useContextoDeHeader } from "@/components/shell/HeaderContexto";
import { useProjetos, type ProjetoNaLista } from "@/modules/demand-access";

/**
 * A seleção de projetos — `Demandas → Projeto → Lente`.
 *
 * O QUE ESTA TELA SUBSTITUI, E POR QUÊ
 * Antes, `/workspace/demandas` renderizava a página `Atividades`: o hub
 * herdado do Trello, com "Meus Quadros", faixa de favoritos, seção de
 * arquivados e nove papéis de parede em gradiente. Ela funcionava, mas
 * ensinava o vocabulário errado — o usuário aprendia que a coisa que ele abre
 * chama-se *quadro*, e a partir daí o Board parecia ser o objeto, não uma
 * visualização.
 *
 * Aqui o objeto é o **projeto**. A palavra "quadro" não aparece nenhuma vez, e
 * a linha de cada projeto responde à única pergunta de quem está escolhendo:
 * *tem trabalho aberto aqui?* O número de abertas vem primeiro e é o único em
 * peso cheio; o total serve de escala, não de destaque.
 *
 * NÃO É UMA GRADE DE CARTÕES
 * Cartão com capa grande é bonito com três projetos e ilegível com trinta —
 * obriga a rolar, e a capa (que ninguém escolheu com significado) domina o
 * nome, que é a informação. Linha densa escala nas duas pontas. A cor do
 * projeto sobrevive num quadradinho de 20px: identifica sem decorar.
 */

function tempoRelativo(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (dias < 1) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function Linha({ projeto: p, onAbrir }: { projeto: ProjetoNaLista; onAbrir: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(p.id)}
      className={cn(
        "group flex w-full items-center gap-3 border-b border-border/40 px-3 py-2.5 text-left",
        "transition-colors duration-fast ease-standard hover:bg-muted/40",
        "focus:outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
      )}
    >
      <span
        aria-hidden
        className="size-5 shrink-0 overflow-hidden rounded-[6px] border border-border/60 bg-muted"
        style={!p.capaUrl && p.cor ? { backgroundColor: p.cor } : undefined}
      >
        {p.capaUrl ? <img src={p.capaUrl} alt="" className="size-full object-cover" /> : null}
      </span>

      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-[13px] font-medium">{p.nome}</span>
        {p.favorito && <Star className="size-3 shrink-0 fill-current text-warning" aria-label="Favorito" />}
        {p.descricao && (
          <span className="ds-caption hidden truncate text-muted-foreground lg:inline">{p.descricao}</span>
        )}
      </span>

      <span className="ds-caption flex shrink-0 items-center gap-4 text-muted-foreground">
        <span className="hidden items-center gap-1 sm:flex">
          <Users className="size-3" aria-hidden />
          <span className="tabular-nums">{p.pessoas}</span>
        </span>
        <span className="hidden w-20 text-right tabular-nums md:inline">{tempoRelativo(p.atualizadoEm)}</span>
        {/* O que decide onde entrar: quanto trabalho vivo há aqui. */}
        <span className="w-20 text-right">
          {p.abertas > 0 ? (
            <>
              <span className="tabular-nums text-foreground">{p.abertas}</span> abertas
            </>
          ) : (
            <span className="text-muted-foreground/60">em dia</span>
          )}
        </span>
      </span>
    </button>
  );
}

export function SelecaoDeProjetos() {
  const navigate = useNavigate();
  const { projetos, carregando, erro } = useProjetos();
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return projetos;
    return projetos.filter((p) => `${p.nome} ${p.descricao ?? ""}`.toLowerCase().includes(t));
  }, [projetos, busca]);

  const abrir = (id: string) => navigate(`/workspace/demandas/${id}`);

  useContextoDeHeader(
    <span className="text-[13px] font-medium text-foreground">
      Projetos{" "}
      <span className="ml-1 tabular-nums font-normal text-muted-foreground">{projetos.length}</span>
    </span>,
    [projetos.length],
  );

  if (carregando) {
    return (
      <div className="flex h-full items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Carregando projetos…</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12" role="alert">
        <p className="ds-body-strong text-destructive">Não foi possível carregar os projetos</p>
        <p className="ds-caption mt-1 text-muted-foreground">{erro.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="surface-glass sticky top-0 z-20 border-b">
        <div className="flex h-10 w-full items-center gap-3 px-4 md:px-6">
          <div className="relative w-56">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar projetos…"
              aria-label="Filtrar projetos"
              className="h-7 border-transparent bg-muted/40 pl-8 text-[13px]"
            />
          </div>
          {busca && (
            <span className="ds-caption tabular-nums text-muted-foreground">
              {visiveis.length} de {projetos.length}
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {visiveis.length === 0 ? (
          <div className="px-4 py-10 md:px-6">
            <EmptyPanel
              title={busca ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
              description={
                busca
                  ? "Tente outro termo."
                  : "Quando houver um projeto com demandas, ele aparece aqui."
              }
            />
          </div>
        ) : (
          <div className="w-full">
            {visiveis.map((p) => (
              <Linha key={p.id} projeto={p} onAbrir={abrir} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
