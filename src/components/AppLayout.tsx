import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

import { NotificationsDrawer } from "@/components/NotificationsDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { countPendingDevEvaluations } from "@/lib/supabaseData";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingTour, useOnboardingTour } from "@/components/OnboardingTour";
import blocoLogo from "@/assets/bloco-logo.png";
import { SidebarGroupsNav } from "@/components/sidebar/SidebarGroupsNav";
import { SidebarBreadcrumb } from "@/components/sidebar/SidebarBreadcrumb";
import { BuscaGlobal } from "@/components/shell/BuscaGlobal";
import { MenuDaConta } from "@/components/shell/MenuDaConta";
import {
  HeaderContexto,
  HeaderContextoProvider,
  useHeaderTemContexto,
} from "@/components/shell/HeaderContexto";
import { builderGroups } from "@/components/sidebar/navGroups";
import { fromUnifiedNav } from "@/components/sidebar/fromUnifiedNav";
import { getNavigation } from "@/modules/navigation";
import { useEcossistemaAutoSync } from "@/modules/ecossistema";
import { attachGlobalErrorHandlers } from "@/modules/errors";

const SIDEBAR_MIN = 176;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 224;
const SIDEBAR_STORAGE_KEY = "app:sidebarWidth";
const SIDEBAR_MINI_KEY = "app:sidebarMini";
const SIDEBAR_MINI_WIDTH = 56;

export default function AppLayout() {
  const { user, signOut, isDual } = useAuth();
  const navigate = useNavigate();
  const { start: startTour } = useOnboardingTour();

  const isDeveloperEffective = user?.role === "developer" || !!user?.isAdministrador;

  // F018.3 — auto-sync do Ecossistema (Realtime → reprocessar-matches, debounced)
  useEcossistemaAutoSync(!!user);
  // FEATURE 023 — Error Center (captura global uma única vez)
  useEffect(() => { attachGlobalErrorHandlers(); }, []);
  const isBuilderRole = user?.role === "builder";
  // FEATURE 026.1 — sidebar simplificado (Demanda + Conhecimento), lido do
  // UnifiedNavigationRegistry em vez do menu antigo de ~40 itens. O papel
  // "builder" ainda não tem um perfil dedicado no registry novo, então
  // continua no menu legado até essa decisão de produto ser tomada.
  //
  // FEATURE 028 — o grupo "Admin" SAI do menu. Antes ele estava aqui porque,
  // sem ele, as ~56 páginas administrativas ficavam inalcançáveis. Agora a
  // paleta (⌘K) indexa todas elas, e o hub /admin continua sendo o índice
  // navegável — então o menu pode carregar só os destinos do dia a dia.
  //
  // O raciocínio: navegação serve exploração, busca serve intenção. Ninguém
  // descobre o Threat Center passeando pelo menu; quem precisa dele sabe que
  // precisa. Manter as 56 no menu cobrava o custo do ruído de todo usuário,
  // em toda sessão, para servir a um acesso ocasional.
  const groups = isBuilderRole
    ? builderGroups
    : isDeveloperEffective
      ? fromUnifiedNav(getNavigation("workspace"))
      : fromUnifiedNav(getNavigation("portal"));
  const roleLabel = user?.isAdministrador
    ? "Administrador"
    : user?.role === "developer"
      ? "Desenvolvedor"
      : user?.role === "builder"
        ? "Builder"
        : "Solicitante";

  /**
   * FAIXA DE ÍCONES — o meio-termo que faltava.
   *
   * Antes só havia dois estados: 208px de menu, ou nenhum menu (`sidebarHidden`).
   * Quem precisava de largura para o conteúdo perdia a navegação inteira e
   * passava a depender do ⌘K para tudo. A faixa de 56px devolve o espaço sem
   * cobrar o preço: os destinos continuam clicáveis, com o rótulo no tooltip.
   */
  const [mini, setMini] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // Quem tinha a barra escondida herda o modo recolhido: o estado "sem menu
    // nenhum" deixou de existir, e ninguém pode ficar preso nele.
    const antigo = window.localStorage.getItem("app:sidebarHidden") === "1";
    if (antigo) window.localStorage.removeItem("app:sidebarHidden");
    return antigo || window.localStorage.getItem(SIDEBAR_MINI_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_MINI_KEY, mini ? "1" : "0");
  }, [mini]);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT;
    const stored = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX
      ? stored
      : SIDEBAR_DEFAULT;
  });
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);
  useEffect(() => {
    const onToggle = () => setMini((v) => !v);
    window.addEventListener("platform:toggle-sidebar", onToggle);
    return () => window.removeEventListener("platform:toggle-sidebar", onToggle);
  }, []);
  const draggingRef = useRef(false);
  const isDeveloper = isDeveloperEffective;
  const [pendingEvalCount, setPendingEvalCount] = useState<number>(0);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isDeveloper) {
      setPendingEvalCount(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const n = await countPendingDevEvaluations();
      if (!cancelled) setPendingEvalCount(n);
    };
    refresh();
    const channel = supabase
      .channel("pending-dev-evals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isDeveloper]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, ev.clientX));
      setSidebarWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const onResizerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSidebarWidth((w) => Math.max(SIDEBAR_MIN, w - 16));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSidebarWidth((w) => Math.min(SIDEBAR_MAX, w + 16));
    }
  };

  /**
   * Telas que cuidam da própria moldura não levam o respiro do layout.
   *
   * O `p-8` global é certo para uma página de formulário e errado para um
   * board: ele afasta as colunas da borda, some com uma coluna inteira na
   * rolagem horizontal e cria uma margem cinza que não separa nada. Quem
   * desenha a própria barra sabe onde quer o respiro.
   *
   * `/demandas/:id` entrou pelo mesmo motivo: são três colunas de altura
   * cheia, e um respiro externo de 32px transformaria a página numa caixa
   * flutuando dentro de outra.
   */
  const molduraPropria = pathname.startsWith("/workspace") || pathname.startsWith("/demandas/");

  return (
    <HeaderContextoProvider>
    <div className="flex h-screen overflow-hidden bg-sidebar">
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      {(isMobile ? mobileOpen : true) && (
        <aside
          aria-label="Navegação principal"
          className={cn(
            "group/sidebar flex-col border-sidebar-border/70 bg-sidebar shrink-0",
            isMobile
              ? "fixed inset-y-0 left-0 z-50 flex w-72 border-r shadow-elev-3"
              : "relative hidden md:flex",
          )}
          style={isMobile ? undefined : { width: mini ? SIDEBAR_MINI_WIDTH : sidebarWidth }}
        >
          {/* Alinhado com a altura do header do conteúdo (h-11 + margem), para
              que logo e breadcrumb fiquem na mesma linha de base. Cabeçalhos
              desalinhados por poucos pixels são o tipo de coisa que ninguém
              nomeia e todo mundo sente. */}
          <div
            className={cn(
              "flex h-[3.125rem] shrink-0 items-center min-w-0",
              mini && !isMobile ? "justify-center px-0" : "gap-2.5 px-3.5",
            )}
          >
            {/* RECOLHIDA, A LOGO É O BOTÃO DE EXPANDIR
                O controle oficial vive no pé da faixa de ícones — longe do olho
                e da mão de quem acabou de recolher a barra. A logo continua no
                topo, é o maior alvo visível e não faz nada: transformá-la no
                mesmo gatilho custa um clique de descoberta em vez de uma
                caçada. Expandida, ela volta a ser só a marca. */}
            {mini && !isMobile ? (
              <button
                type="button"
                onClick={() => setMini(false)}
                title="Expandir barra lateral"
                aria-label="Expandir barra lateral"
                aria-expanded={false}
                className={cn(
                  "shrink-0 cursor-pointer rounded-md transition-transform duration-fast ease-standard",
                  "hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                <img
                  src={blocoLogo}
                  alt="Bloco Construções"
                  className="size-7 rounded-md object-cover"
                />
              </button>
            ) : (
              <img
                src={blocoLogo}
                alt="Bloco Construções"
                className="size-7 rounded-md object-cover shrink-0"
              />
            )}
            {(!mini || isMobile) && (
              <div className="min-w-0">
                <div className="text-[13px] font-brand font-semibold tracking-tight truncate">
                  Gestor de Automações
                </div>
              </div>
            )}
          </div>

          {/*
            SEM O RODAPÉ, O `flex-1` VIRAVA UM VAZIO DE TELA INTEIRA
            A navegação esticava para ocupar toda a altura porque precisava
            empurrar o bloco da conta para o pé. A conta subiu para o header e
            esse esticamento perdeu a razão de existir — o que sobrou foi um
            painel branco de mil pixels embaixo de quatro itens.

            Agora a lista tem a altura dos próprios itens e rola só se
            precisar. O vazio abaixo continua sendo a barra, não um bloco
            esticado dentro dela: a diferença aparece no hover e em qualquer
            fundo que não seja liso.
          */}
          <nav
            className={cn(
              "min-h-0 shrink space-y-0.5 overflow-y-auto py-1",
              mini && !isMobile ? "px-2" : "px-3",
            )}
            aria-label="Menu"
          >
            <SidebarGroupsNav
              groups={groups}
              isDeveloper={isDeveloper}
              pendingEvalCount={pendingEvalCount}
              mini={mini && !isMobile}
            />
          </nav>
          {/* Recolhida, a largura é fixa — não há o que arrastar. */}
          {!mini && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar barra lateral"
              tabIndex={0}
              onPointerDown={startDrag}
              onKeyDown={onResizerKeyDown}
              onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
              className="hidden md:block absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize bg-transparent hover:bg-accent/40 active:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:bg-accent/60"
              title="Arraste para redimensionar (duplo clique para resetar)"
            />
          )}

          {/* Um botão, dois estados — completa ou recolhida. O terceiro estado
              ("sem menu nenhum") saiu: ele resolvia o mesmo problema que a
              faixa de ícones resolve melhor, e três estados de menu é um a
              mais do que alguém consegue prever antes de clicar. */}
          <button
            type="button"
            onClick={() => (isMobile ? setMobileOpen(false) : setMini((v) => !v))}
            title={isMobile ? "Fechar menu" : mini ? "Expandir barra lateral" : "Recolher barra lateral"}
            aria-label={isMobile ? "Fechar menu" : mini ? "Expandir barra lateral" : "Recolher barra lateral"}
            aria-expanded={isMobile ? undefined : !mini}
            className={cn(
              // Era um ícone de 20px com 40% de opacidade encostado na borda:
              // um controle que a pessoa só encontra por acidente. Agora tem
              // alvo de 28px, aparece de leve no hover da barra e ganha
              // contorno ao ser focado pelo teclado — o mesmo botão, achável.
              "absolute z-10 flex items-center justify-center rounded-md",
              "text-muted-foreground/50 opacity-0 transition-all duration-fast ease-standard",
              "group-hover/sidebar:opacity-100 focus-visible:opacity-100",
              "hover:bg-muted/70 hover:text-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              isMobile
                ? "top-3 right-3 size-8 opacity-100"
                : mini
                  ? "bottom-2 left-1/2 size-7 -translate-x-1/2"
                  : "top-3 right-2 size-7",
            )}
          >
            {isMobile ? (
              <X className="size-4" />
            ) : mini ? (
              <PanelLeftOpen className="size-3.5" />
            ) : (
              <PanelLeftClose className="size-3.5" />
            )}
          </button>
        </aside>
      )}

      {/* O conteúdo flutua sobre a barra: superfície própria, canto arredondado
          do lado que encosta nela, e um fio de borda. É o que transforma o
          vazio da lateral em moldura da janela em vez de painel sem conteúdo. */}
      <main
        className={cn(
          // `flex flex-col` e o que faltava. `<main>` tinha altura definida
          // (é `flex-1` dentro de uma linha de `h-screen`) e `overflow-hidden`
          // para que cada tela cuidasse da própria rolagem — mas ele nunca foi
          // um container flex. Os cabeçalhos e o conteúdo empilhavam como
          // blocos comuns, e a caixa do conteúdo ficava do tamanho do que
          // havia dentro dela. O excesso não rolava: era CORTADO pelo
          // `overflow-hidden`, sem barra e sem aviso.
          "relative flex min-w-0 flex-1 flex-col overflow-hidden",
          "md:my-1.5 md:mr-1.5 md:rounded-xl md:border md:border-border/70 md:bg-background",
          "md:shadow-elev-1",
        )}
      >
        {/* Header desktop: breadcrumb automático + trigger de sidebar */}
        <header className="surface-glass sticky top-0 z-30 hidden h-11 items-center gap-3 border-b border-border/60 px-4 md:flex">
          {/* Uma faixa só. Quando a página tem contexto próprio — o projeto
              aberto, seus números — ele ocupa este espaço no lugar do
              breadcrumb, que diria a mesma coisa com menos precisão. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 text-xs">
            <HeaderContextoSlotOuBreadcrumb groups={groups} />
          </div>
          {/* FEATURE 028 — o gatilho visível da paleta. Sem ele, tirar 56 itens
              do menu seria esconder as telas; com ele, é trocar navegação por
              busca, que é a ferramenta certa para acesso por intenção. */}
          <BuscaGlobal />
          {/* A conta vive aqui, não no pé do menu: a barra lateral responde
              "para onde eu vou", o header responde "quem eu sou e o que faço
              com esta sessão". São perguntas diferentes. */}
          <MenuDaConta ehDaEquipe={isDeveloperEffective} aoRefazerTour={startTour} />
        </header>

        {/* Header mobile */}
        <header className="md:hidden border-b border-border/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              title="Abrir menu"
              className="shrink-0"
            >
              <Menu className="size-5" />
            </Button>
            <img
              src={blocoLogo}
              alt="Bloco Construções"
              className="size-7 rounded-md object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[13px] font-brand font-semibold tracking-tight truncate">Gestor de Automações</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span data-tour="nav-notificacoes" className="inline-flex">
              <NotificationsDrawer />
            </span>
            <Button
              variant="ghost"
              size="icon"
              data-tour="nav-tour"
              onClick={startTour}
              title="Refazer tour"
              aria-label="Refazer tour"
            >
              <Compass className="size-4" />
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
      {/*
        ONDE A ROLAGEM ACONTECE — E POR QUE DEPENDE DA PÁGINA

        Esta caixa era `w-full min-w-0` e mais nada: sem altura e sem flex. Uma
        tela que pedia `h-full` recebia 100% de um pai cuja altura era "o
        tamanho do meu conteúdo" — sempre suficiente, por definição. Nenhuma
        rolagem interna jamais teve o que rolar, e o que passava do fim da
        janela sumia atrás do `overflow-hidden` do `<main>`. Era por isso que
        só diminuindo o zoom dava para ler o resto.

        `min-h-0 flex-1` fecha a conta: a caixa passa a valer exatamente o
        espaço que sobra abaixo dos cabeçalhos, e pode ficar MENOR que o
        conteúdo — que é a condição para existir rolagem.

        As duas metades da regra:

        `molduraPropria` — Workspace e a tela da demanda desenham colunas de
        altura cheia, cada uma com a sua própria área de rolagem. Aqui a caixa
        segura o `overflow-hidden` e não rola nada: quem rola são os painéis
        lá dentro, e é isso que mantém cabeçalho e barra de resposta fixos
        enquanto só a conversa se move.

        Todo o resto — páginas de documento comum, que rolam inteiras. A
        rolagem mora aqui, uma só, e o respiro de 32px vem junto.
      */}
        <div
          className={cn(
            "min-h-0 w-full min-w-0 flex-1",
            molduraPropria ? "overflow-hidden" : "overflow-y-auto rolagem-discreta p-4 md:p-8",
          )}
        >
          <OnboardingTour />
          <Outlet />
        </div>
      </main>
    </div>
    </HeaderContextoProvider>
  );
}

/**
 * O breadcrumb é o padrão; o contexto da página tem precedência.
 *
 * Componente separado porque só um filho do provider consegue ler a pilha —
 * o `AppLayout` é quem monta o provider e não enxerga o próprio contexto.
 */
function HeaderContextoSlotOuBreadcrumb({ groups }: { groups: Parameters<typeof SidebarBreadcrumb>[0]["groups"] }) {
  const temContexto = useHeaderTemContexto();
  return temContexto ? <HeaderContexto /> : <SidebarBreadcrumb groups={groups} />;
}
