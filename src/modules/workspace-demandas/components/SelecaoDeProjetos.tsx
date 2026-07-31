import { useMemo, useState } from "react";
import { isBoardIconUrl } from "@/lib/atividadesBoards";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Inbox,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/design-system";
import { cn } from "@/lib/utils";
import { usePreferencia } from "@/hooks/usePreferencia";
import { useToast } from "@/hooks/use-toast";
import { useContextoDeHeader } from "@/components/shell/HeaderContexto";
import {
  INBOX_ID,
  useCriarProjeto,
  useDemandas,
  useExcluirProjeto,
  useProjetos,
  type Escopo,
  type ProjetoNaLista,
} from "@/modules/demand-access";
import type { IdentidadeDoProjeto } from "@/modules/demand-access";
import { NovoProjetoDialog } from "./NovoProjetoDialog";

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

function Linha({
  projeto: p,
  onAbrir,
  onArquivar,
  onRestaurar,
  onExcluir,

}: {
  projeto: ProjetoNaLista;
  onAbrir: (id: string) => void;
  onArquivar: (p: ProjetoNaLista) => void;
  onRestaurar: (p: ProjetoNaLista) => void;
  /**
   * Excluir de vez. Só chega aqui nas linhas arquivadas: arquivar é o caminho
   * normal, e excluir é o que se faz com o que já foi tirado da frente e não
   * vai voltar — teste, duplicado, quadro criado por engano.
   */
  onExcluir?: (p: ProjetoNaLista) => void;
}) {

  return (
    /**
     * A linha deixou de ser um <button> e virou um <div> com o botão dentro.
     *
     * Não é preferência de marcação: botão dentro de botão é HTML inválido, e
     * o navegador resolve isso desmontando a estrutura por conta própria — o
     * clique passa a cair no elemento errado de um jeito que varia entre
     * navegadores. Com o alvo de navegação e a ação como irmãos, cada um
     * recebe o próprio clique, o próprio foco e a própria tecla Enter.
     */
    <div
      className={cn(
        "group flex w-full items-center border-b border-border/40",
        "transition-colors duration-fast ease-standard hover:bg-muted/40",
        p.arquivado && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => onAbrir(p.id)}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left",
          "focus:outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-border/60 bg-muted leading-none",
            isBoardIconUrl(p.icone) && !p.capaUrl ? "size-7" : "size-5 text-[11px]",
          )}
          style={!p.capaUrl && p.cor && !isBoardIconUrl(p.icone) ? { backgroundColor: p.cor } : undefined}
        >
          {p.capaUrl ? (
            <img src={p.capaUrl} alt="" className="size-full object-cover" />
          ) : isBoardIconUrl(p.icone) ? (
            <img src={p.icone as string} alt="" className="size-full rounded-md object-cover" />
          ) : (
            p.icone ?? null
          )}
        </span>


        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="truncate text-[13px] font-medium">{p.nome}</span>
          {p.favorito && <Star className="size-3 shrink-0 fill-current text-warning" aria-label="Favorito" />}
          {p.arquivado && (
            <span className="ds-caption shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
              arquivado
            </span>
          )}
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

      {/* Aparece no hover para não competir com o nome, que é a informação
          que se lê. Continua alcançável por teclado — some da vista, não da
          navegação. */}
      <span className="flex shrink-0 items-center pr-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={() => (p.arquivado ? onRestaurar(p) : onArquivar(p))}
          aria-label={p.arquivado ? `Restaurar ${p.nome}` : `Arquivar ${p.nome}`}
          title={p.arquivado ? "Restaurar" : "Arquivar"}
        >
          {p.arquivado ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
        </Button>
        {p.arquivado && onExcluir && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onExcluir(p)}
            aria-label={`Excluir ${p.nome}`}
            title="Excluir"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </span>
    </div>

  );
}

/**
 * A Inbox fica ACIMA dos projetos, e separada por uma linha mais forte.
 *
 * Não é um projeto — é a etapa anterior a existir um. Colocá-la no meio da
 * lista, ordenada junto com os outros, ensinaria a ideia errada: que
 * "aguardando classificação" é um lugar onde o trabalho mora, e não um lugar
 * de passagem. Em cima e destacada, ela lê como caixa de entrada de e-mail:
 * o primeiro lugar que se olha, e que se espera esvaziar.
 */
function LinhaDaInbox({ aguardando, onAbrir }: { aguardando: number; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={cn(
        "group flex w-full items-center gap-3 border-b-2 border-border px-3 py-2.5 text-left",
        "transition-colors duration-fast ease-standard hover:bg-muted/40",
        "focus:outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
      )}
    >
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-border/60 bg-muted"
      >
        <Inbox className="size-3 text-muted-foreground" />
      </span>

      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-[13px] font-medium">Caixa de Entrada</span>
      </span>


      <span className="ds-caption flex shrink-0 items-center gap-4 text-muted-foreground">
        <span className="w-32 text-right">
          {aguardando > 0 ? (
            <>
              <span className="tabular-nums text-foreground">{aguardando}</span> aguardando
            </>
          ) : (
            <span className="text-muted-foreground/60">vazia</span>
          )}
        </span>
      </span>
    </button>
  );
}

const ESCOPO_GLOBAL: Escopo = { tipo: "global" };

export function SelecaoDeProjetos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  /**
   * A escolha de ver arquivados sobrevive à navegação.
   *
   * Quem liga isso está procurando algo específico e vai abrir e fechar
   * projetos até achar. Reencontrar a lista limpa a cada volta faria a busca
   * recomeçar do zero — e é justamente a busca que motivou ligar o filtro.
   */
  const [mostrarArquivados, setMostrarArquivados] = usePreferencia<boolean>(
    "projetos:arquivados",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [aExcluir, setAExcluir] = useState<ProjetoNaLista | null>(null);
  const { projetos, carregando, erro, arquivar, restaurar } = useProjetos({
    incluirArquivados: mostrarArquivados,
  });
  // A contagem da Inbox vem pela mesma porta que todo o resto — esta tela
  // continua sem saber que existe tabela.
  const { demandas: naInbox } = useDemandas(ESCOPO_GLOBAL);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const { criar, salvando } = useCriarProjeto();

  const aguardando = useMemo(() => naInbox.filter((d) => !d.concluida).length, [naInbox]);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return projetos;
    return projetos.filter((p) => `${p.nome} ${p.descricao ?? ""}`.toLowerCase().includes(t));
  }, [projetos, busca]);

  const abrir = (id: string) => navigate(`/workspace/demandas/${id}`);

  /**
   * Arquivar faz o projeto sumir da lista. Sem um caminho de volta imediato,
   * isso é indistinguível de apagar — e a pessoa que não sabe se pode voltar
   * atrás simplesmente não clica.
   *
   * O desfazer no aviso resolve o arrependimento de um segundo; o filtro
   * "Arquivados" resolve o de uma semana. São dois problemas diferentes e
   * precisam dos dois caminhos.
   */
  const aoArquivar = async (p: ProjetoNaLista) => {
    try {
      await arquivar(p.id);
      toast({
        title: `${p.nome} foi arquivado`,
        description: "Ele sai da lista, mas nada é apagado.",
        action: (
          <Button variant="outline" size="sm" onClick={() => void restaurar(p.id)}>
            Desfazer
          </Button>
        ),
      });
    } catch (e) {
      toast({
        title: "Não foi possível arquivar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const aoRestaurar = async (p: ProjetoNaLista) => {
    try {
      await restaurar(p.id);
      toast({ title: `${p.nome} voltou para a lista` });
    } catch (e) {
      toast({
        title: "Não foi possível restaurar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const exclusao = useExcluirProjeto();

  const aoExcluir = async () => {
    const p = aExcluir;
    if (!p) return;
    try {
      await exclusao.excluir(p.id);
      setAExcluir(null);
      toast({ title: `${p.nome} foi excluído` });
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  /**
   * Criar e entrar. Um quadro recém-criado está vazio por definição: deixar a
   * pessoa na lista, olhando o nome novo, obrigaria um segundo clique para
   * chegar onde ela já queria estar.
   */
  const aoCriar = async (nome: string, identidade: IdentidadeDoProjeto) => {
    try {
      const id = await criar(nome, identidade);
      setCriando(false);
      toast({ title: `${nome} foi criado`, description: "Já com A Fazer, Em Andamento e Concluído." });
      navigate(`/workspace/demandas/${id}`);
    } catch (e) {
      toast({
        title: "Não foi possível criar o quadro",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };



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
          <Button
            size="sm"
            data-testid="abrir-criar-quadro"
            className="ml-auto h-7 gap-1.5 px-2.5 text-[13px]"
            onClick={() => setCriando(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Criar quadro
          </Button>
          <button

            type="button"
            onClick={() => setMostrarArquivados(!mostrarArquivados)}
            aria-pressed={mostrarArquivados}
            className={cn(
              "ds-caption flex items-center gap-1.5 rounded-md px-2 py-1",
              "transition-colors duration-fast ease-standard",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              mostrarArquivados
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Archive className="size-3.5" aria-hidden />
            Arquivados
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {/* Fora do filtro de busca de propósito: a Inbox é um destino fixo,
            não um projeto que se procura pelo nome. */}
        {!busca && (
          <LinhaDaInbox
            aguardando={aguardando}
            onAbrir={() => navigate(`/workspace/demandas/${INBOX_ID}`)}
          />
        )}
        {visiveis.length === 0 ? (
          <div className="px-4 py-10 md:px-6">
            <EmptyPanel
              title={busca ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
              description={
                busca
                  ? "Tente outro termo."
                  : "Crie um quadro para começar a organizar o trabalho."
              }
              action={
                busca ? undefined : (
                  <Button size="sm" onClick={() => setCriando(true)} className="gap-1.5">
                    <Plus className="size-3.5" aria-hidden />
                    Criar quadro
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="w-full">
            {visiveis.map((p) => (
              <Linha
                key={p.id}
                projeto={p}
                onAbrir={abrir}
                onArquivar={(x) => void aoArquivar(x)}
                onRestaurar={(x) => void aoRestaurar(x)}
                onExcluir={(x) => setAExcluir(x)}
              />
            ))}
          </div>
        )}
      </div>

      <NovoProjetoDialog
        open={criando}
        onOpenChange={setCriando}
        salvando={salvando}
        onCriar={(nome, identidade) => void aoCriar(nome, identidade)}
      />

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{aExcluir?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Isso apagará todas as tarefas deste quadro e não pode ser
              desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exclusao.salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={exclusao.salvando}
              onClick={(e) => {
                e.preventDefault();
                void aoExcluir();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {exclusao.salvando ? "Excluindo…" : "Excluir quadro"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

