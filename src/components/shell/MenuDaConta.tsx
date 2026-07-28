import { useNavigate } from "react-router-dom";
import { Compass, HelpCircle, LogOut, Repeat, Settings2, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsDrawer } from "@/components/NotificationsDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * A conta sai do rodapé da barra lateral e sobe para o header.
 *
 * O QUE ESTAVA ERRADO
 * Perfil, notificações, tour, ajuda, administração, tema, troca de perfil e
 * sair moravam empilhados no pé do menu — oito controles numa faixa de 1px de
 * respiro, competindo com a navegação que é a função da barra. E ficavam
 * abaixo de um vazio enorme, porque o menu tem quatro itens e a barra ocupa a
 * altura inteira da tela: o olho percorria um deserto até encontrá-los.
 *
 * POR QUE NO CANTO SUPERIOR DIREITO
 * É onde todo produto desta categoria põe a conta — e não por moda: a barra
 * lateral responde "para onde eu vou", o header responde "quem eu sou e o que
 * faço com esta sessão". São perguntas diferentes, e misturá-las obriga a
 * pessoa a procurar em dois lugares.
 *
 * O QUE FICA FORA DO MENU
 * Notificações e tema seguem como botões próprios ao lado do avatar. Os dois
 * são de uso frequente e alternância rápida; enterrá-los num menu cobraria
 * dois cliques por algo que se faz o tempo todo.
 */
interface Props {
  className?: string;
  /** Vem do AppLayout: `isDeveloperEffective` e `startTour` moram lá, não no useAuth. */
  ehDaEquipe: boolean;
  aoRefazerTour?: () => void;
}

export function MenuDaConta({ className, ehDaEquipe, aoRefazerTour }: Props) {
  const navigate = useNavigate();
  const { user, signOut, isDual } = useAuth();

  const iniciais = (user?.nome || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const papel = user?.isAdministrador
    ? "Administrador"
    : user?.role === "developer"
      ? "Desenvolvedor"
      : user?.role === "builder"
        ? "Builder"
        : "Solicitante";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <span data-tour="nav-notificacoes" className="inline-flex">
        <NotificationsDrawer />
      </span>
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "ml-1 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full",
            "ring-1 ring-border transition-shadow hover:ring-border-strong",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          )}
          aria-label="Minha conta"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
              {iniciais}
            </span>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          {/* O nome inteiro cabe aqui — na barra lateral ele vinha cortado com
              reticências, e nome truncado é a informação mais irritante de
              todas: mostra que existe e esconde qual é. */}
          <DropdownMenuLabel className="font-normal">
            <span className="block text-[13px] font-medium leading-tight">{user?.nome}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{papel}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => navigate("/perfil")} className="menu-item-animado gap-2 text-[13px]">
            <UserRound className="size-3.5" aria-hidden />
            Meu perfil
          </DropdownMenuItem>

          {ehDaEquipe && (
            <DropdownMenuItem onSelect={() => navigate("/admin")} className="menu-item-animado gap-2 text-[13px]">
              <Settings2 className="size-3.5" aria-hidden />
              Administração
            </DropdownMenuItem>
          )}

          {isDual && (
            <DropdownMenuItem
              onSelect={() => navigate("/escolher-perfil")}
              className="menu-item-animado gap-2 text-[13px]"
            >
              <Repeat className="size-3.5" aria-hidden />
              Trocar de perfil
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {aoRefazerTour && (
            <DropdownMenuItem onSelect={() => aoRefazerTour()} className="menu-item-animado gap-2 text-[13px]">
              <Compass className="size-3.5" aria-hidden />
              Refazer o tour
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => navigate("/ajuda")} className="menu-item-animado gap-2 text-[13px]">
            <HelpCircle className="size-3.5" aria-hidden />
            Ajuda
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              signOut();
              navigate("/auth");
            }}
            className="menu-item-animado menu-item-animado--destrutivo gap-2 text-[13px] text-destructive focus:text-destructive"
          >
            <LogOut className="size-3.5" aria-hidden />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
