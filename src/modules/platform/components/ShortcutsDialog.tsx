import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatHotkey } from "../utils/hotkeys";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUPS: { title: string; items: { combo: string; label: string }[] }[] = [
  {
    title: "Global",
    items: [
      { combo: "mod+k", label: "Abrir Command Palette" },
      { combo: "?", label: "Mostrar atalhos" },
      { combo: "mod+.", label: "Modo foco (esconder barra lateral)" },
      { combo: "esc", label: "Fechar diálogo aberto" },
    ],
  },
  {
    title: "Navegação",
    items: [
      { combo: "mod+shift+i", label: "Abrir Inbox" },
      { combo: "mod+shift+d", label: "Abrir Dashboard" },
      { combo: "mod+shift+k", label: "Abrir Kanban" },
      { combo: "mod+shift+a", label: "Abrir AI Workspace" },
      { combo: "mod+shift+n", label: "Nova Solicitação" },
    ],
  },
  {
    title: "Demanda selecionada",
    items: [
      { combo: "a", label: "Atribuir" },
      { combo: "p", label: "Alterar prioridade" },
      { combo: "s", label: "Alterar status" },
      { combo: "c", label: "Comentários / Timeline" },
      { combo: "w", label: "Automações (Workflow)" },
      { combo: "k", label: "Sugestões (Knowledge)" },
      { combo: "r", label: "Smart Routing" },
    ],
  },
];

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Trabalhe mais rápido pelo teclado. Pressione <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">?</kbd> a qualquer momento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </p>
              <ul className="space-y-1.5">
                {g.items.map((it) => (
                  <li key={it.combo} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{it.label}</span>
                    <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-foreground">
                      {formatHotkey(it.combo)}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
