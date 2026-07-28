import { memo, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findActive, type NavGroup, type NavItem } from "./navGroups";

const GROUP_STORAGE_PREFIX = "ds2:sidebar:";

function dataTourFor(item: NavItem): string | null {
  // FEATURE 026.1 — inclui as rotas novas do UnifiedNavigationRegistry
  // (/workspace, /workspace/demandas, /portal/inicio, /portal/demandas),
  // mantendo compatibilidade com as rotas antigas para não quebrar o tour.
  if (
    item.to === "/dashboard" ||
    item.to === "/dashboard-solicitante" ||
    item.to === "/workspace" ||
    item.to === "/portal/inicio"
  )
    return "nav-dashboard";
  if (
    item.matchPrefix === "/solicitacoes" ||
    item.to === "/minhas-solicitacoes" ||
    item.to === "/workspace/demandas" ||
    item.to === "/portal/demandas"
  )
    return "nav-solicitacoes";
  if (item.matchPrefix === "/solucoes") return "nav-solucoes";
  if (item.to === "/ajuda") return "nav-ajuda";
  return null;
}

function readStored(groupId: string): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(GROUP_STORAGE_PREFIX + groupId);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

function writeStored(groupId: string, open: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GROUP_STORAGE_PREFIX + groupId, open ? "1" : "0");
}

interface Props {
  groups: NavGroup[];
  isDeveloper: boolean;
  pendingEvalCount: number;
  /** Faixa de ícones: só o ícone aparece, o rótulo vira tooltip. */
  mini?: boolean;
}

function SidebarGroupsNavImpl({ groups, isDeveloper, pendingEvalCount, mini }: Props) {
  const { pathname } = useLocation();
  const active = useMemo(() => findActive(groups, pathname), [groups, pathname]);

  /**
   * CABEÇALHO DE GRUPO SÓ EXISTE QUANDO HÁ MAIS DE UM GRUPO
   *
   * Com um grupo só — que é o caso do Workspace hoje — o cabeçalho "WORKSPACE"
   * gastava uma linha para nomear a única coisa que existe, e ainda oferecia
   * um botão que recolhe o menu inteiro. Recolher tudo não é um estado que
   * alguém queira: é a navegação desaparecendo sem que ela tenha ido para
   * lugar nenhum. Rótulo que não distingue nada é ruído.
   */
  const comCabecalho = groups.length > 1;

  return (
    <div className={mini ? "space-y-1" : "space-y-4"}>
      {groups.map((group) => (
        <SidebarGroupBlock
          key={group.id}
          group={group}
          activeGroupId={active?.group.id ?? null}
          isDeveloper={isDeveloper}
          pendingEvalCount={pendingEvalCount}
          comCabecalho={comCabecalho}
          mini={mini}
        />
      ))}
    </div>
  );
}

export const SidebarGroupsNav = memo(SidebarGroupsNavImpl);

function SidebarGroupBlock({
  group,
  activeGroupId,
  isDeveloper,
  pendingEvalCount,
  comCabecalho,
  mini,
}: {
  group: NavGroup;
  activeGroupId: string | null;
  isDeveloper: boolean;
  pendingEvalCount: number;
  comCabecalho: boolean;
  mini?: boolean;
}) {
  const isActiveGroup = activeGroupId === group.id;
  const [open, setOpen] = useState<boolean>(() => {
    const stored = readStored(group.id);
    return stored ?? isActiveGroup;
  });

  // Auto-expande quando a rota atual passa a pertencer ao grupo.
  useEffect(() => {
    if (isActiveGroup) setOpen(true);
  }, [isActiveGroup]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      writeStored(group.id, next);
      return next;
    });
  };

  const GroupIcon = group.icon;
  const contentId = `sidebar-group-${group.id}`;

  // Sem cabeçalho, o grupo é só a lista — e não há o que recolher.
  if (!comCabecalho) {
    return (
      <div className={mini ? "space-y-1" : "space-y-0.5"}>
        {group.items.map((item) => (
          <SidebarNavItem
            key={item.label}
            item={item}
            isDeveloper={isDeveloper}
            pendingEvalCount={pendingEvalCount}
            mini={mini}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={`${group.label} — ${open ? "recolher" : "expandir"}`}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 rounded-md ds-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          isActiveGroup
            ? "text-muted-foreground"
            : "text-muted-foreground/70 hover:text-muted-foreground",
        )}
      >
        <GroupIcon className="size-3.5 shrink-0 opacity-60" />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200 opacity-60",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={contentId}
        role="group"
        aria-hidden={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr] mt-1" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pl-1">
            {group.items.map((item) => (
              <SidebarNavItem
                key={item.label}
                item={item}
                isDeveloper={isDeveloper}
                pendingEvalCount={pendingEvalCount}
                dim={!isActiveGroup}
                mini={mini}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarNavItem({
  item,
  isDeveloper,
  pendingEvalCount,
  dim,
  mini,
}: {
  item: NavItem;
  isDeveloper: boolean;
  pendingEvalCount: number;
  dim?: boolean;
  mini?: boolean;
}) {
  const { pathname } = useLocation();
  const hasChildren = !!item.children?.length;

  const isParentActive = useMemo(() => {
    if (!item.matchPrefix) return false;
    return pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/");
  }, [pathname, item.matchPrefix]);

  const [open, setOpen] = useState<boolean>(isParentActive);
  useEffect(() => {
    if (isParentActive) setOpen(true);
  }, [isParentActive]);

  const showBadge =
    isDeveloper &&
    (item.matchPrefix === "/solicitacoes" || item.to === "/workspace/demandas") &&
    pendingEvalCount > 0;
  const dataTour = dataTourFor(item);
  const Icon = item.icon;

  if (!hasChildren) {
    /**
     * O ITEM ATIVO GANHA UMA BARRA, NÃO SÓ UM FUNDO
     *
     * Fundo sutil sozinho obriga a comparar dois tons para descobrir onde se
     * está — uma tarefa que exige olhar direto para o menu. A barra na borda
     * é lida pela visão periférica: você sabe onde está sem tirar os olhos do
     * conteúdo. O ícone também perde a transparência quando ativo, porque
     * meio-tom é o que o olho lê como "desligado".
     */
    const link = (
      <NavLink
        to={item.to!}
        end
        {...(dataTour ? { "data-tour": dataTour } : {})}
        title={mini ? undefined : item.label}
        className={({ isActive }) =>
          cn(
            "group relative flex min-w-0 items-center rounded-lg text-[13px] leading-5",
            // Cor E transform na transição: o item afunda 1px ao ser pressionado,
            // que é o retorno tátil que separa um botão de um link decorado.
            "transition-[background-color,color] duration-fast ease-standard active:translate-y-px",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            // Recolhida, o alvo é um quadrado centrado pelo próprio eixo. Antes
            // ele herdava o alinhamento do container e ficava fora do centro por
            // alguns pixels — e um menu inteiro desalinhado lê-se como descuido
            // antes de qualquer outra coisa.
            mini ? "mx-auto size-9 justify-center" : "h-8 gap-2.5 px-2.5",
            isActive
              ? // O ativo ganha superfície cheia e texto em peso médio. Antes o
                // contraste vinha só de um fundo a 100% de um tom quase igual ao
                // da barra — bastava o monitor estar mal calibrado para sumir.
                "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : cn(
                  "hover:bg-sidebar-accent/60",
                  dim ? "text-sidebar-foreground/55" : "text-sidebar-foreground/80",
                ),
          )
        }
        aria-current={pathname === item.to ? "page" : undefined}
      >
        {({ isActive }: { isActive: boolean }) => (
          <>
            {/* A barra fica FORA da caixa do item (-left-2), encostada na borda
                da barra lateral. Dentro dela, competia com o próprio fundo do
                item ativo e virava um detalhe redundante; encostada na borda,
                é o sinal que a visão periférica capta sem foco direto. */}
            {isActive && !mini && (
              <span
                aria-hidden
                className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
              />
            )}
            <Icon
              className={cn(
                "size-[17px] shrink-0 transition-opacity duration-fast",
                isActive ? "opacity-100" : "opacity-60 group-hover:opacity-90",
              )}
            />
            {!mini && <span className="truncate flex-1">{item.label}</span>}
          </>
        )}
      </NavLink>
    );

    // Recolhida, o rótulo não cabe — mas ele não pode sumir, senão o menu vira
    // uma coluna de símbolos que só quem já decorou consegue usar.
    if (!mini) return link;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        {...(dataTour ? { "data-tour": dataTour } : {})}
        className={cn(
          "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] leading-5 transition-colors duration-fast ease-standard min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          isParentActive
            ? "bg-sidebar-accent/40 font-medium text-sidebar-accent-foreground"
            : cn(
                "hover:bg-sidebar-accent/50",
                dim ? "text-sidebar-foreground/60" : "text-sidebar-foreground/85",
              ),
        )}
      >
        <Icon className="size-4 shrink-0 opacity-80" />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {showBadge && (
          <Badge
            className="text-[10px] py-0 px-1.5 h-5 shrink-0 tabular-nums"
            title="Solicitações aguardando avaliação técnica"
          >
            ⚙ {pendingEvalCount}
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform text-muted-foreground",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border/60 space-y-0.5">
          {item.children!.map((child) => {
            const ChildIcon = child.icon;
            return (
              <NavLink
                key={child.to}
                to={child.to!}
                end
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                  )
                }
                aria-current={pathname === child.to ? "page" : undefined}
              >
                <ChildIcon className="size-3.5 shrink-0" />
                <span className="truncate">{child.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
