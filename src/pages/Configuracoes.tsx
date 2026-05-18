import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DbRole = "developer" | "requester" | "builder";

type Account = {
  email: string;
  role: DbRole;
  nome: string | null;
  profile_nome: string | null;
  user_id: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<DbRole, string> = {
  developer: "Desenvolvedor",
  requester: "Solicitante",
  builder: "Builder",
};

const ROLE_BADGE: Record<DbRole, string> = {
  developer: "bg-primary/15 text-primary border-primary/30",
  builder: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  requester: "bg-muted text-muted-foreground border-border",
};

export default function Configuracoes() {
  const { user } = useAuth();
  if (user?.role !== "developer") {
    return (
      <div className="text-sm text-muted-foreground">
        Acesso restrito a desenvolvedores.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie acessos, papéis e cadastros do sistema.
        </p>
      </header>

      <Tabs defaultValue="acessos">
        <TabsList>
          <TabsTrigger value="acessos">Acessos</TabsTrigger>
          <TabsTrigger value="catalogos" disabled>
            Catálogos (em breve)
          </TabsTrigger>
          <TabsTrigger value="aparencia" disabled>
            Aparência (em breve)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acessos" className="mt-4">
          <AcessosPanel currentUserId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AcessosPanel({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | DbRole>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newRole, setNewRole] = useState<DbRole>("requester");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_accounts");
    if (error) {
      toast({
        title: "Erro ao carregar contas",
        description: error.message,
        variant: "destructive",
      });
      setAccounts([]);
    } else {
      setAccounts((data ?? []) as Account[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return accounts.filter((a) => {
      if (roleFilter !== "all" && a.role !== roleFilter) return false;
      if (!q) return true;
      return (
        a.email.toLowerCase().includes(q) ||
        (a.nome ?? "").toLowerCase().includes(q) ||
        (a.profile_nome ?? "").toLowerCase().includes(q)
      );
    });
  }, [accounts, filter, roleFilter]);

  async function handleCreate() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("allowed_emails").insert({
      email,
      role: newRole,
      nome: newNome.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Conta cadastrada",
      description: `${email} pode entrar como ${ROLE_LABEL[newRole]}.`,
    });
    setCreateOpen(false);
    setNewEmail("");
    setNewNome("");
    setNewRole("requester");
    refresh();
  }

  async function handleRoleChange(account: Account, role: DbRole) {
    if (account.role === role) return;
    if (account.user_id === currentUserId && role !== "developer") {
      toast({
        title: "Operação bloqueada",
        description: "Você não pode remover seu próprio acesso de Desenvolvedor.",
        variant: "destructive",
      });
      return;
    }
    setBusyEmail(account.email);
    const { error } = await supabase
      .from("allowed_emails")
      .update({ role })
      .eq("email", account.email);
    setBusyEmail(null);
    if (error) {
      toast({
        title: "Erro ao alterar papel",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Papel atualizado", description: `${account.email} → ${ROLE_LABEL[role]}.` });
    refresh();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.user_id === currentUserId) {
      toast({
        title: "Operação bloqueada",
        description: "Você não pode remover sua própria conta.",
        variant: "destructive",
      });
      setPendingDelete(null);
      return;
    }
    setBusyEmail(pendingDelete.email);
    const { error } = await supabase
      .from("allowed_emails")
      .delete()
      .eq("email", pendingDelete.email);
    setBusyEmail(null);
    if (error) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Conta removida", description: pendingDelete.email });
    }
    setPendingDelete(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar por e-mail ou nome..."
              className="pl-8"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              <SelectItem value="developer">Desenvolvedor</SelectItem>
              <SelectItem value="requester">Solicitante</SelectItem>
              <SelectItem value="builder">Builder</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-1" /> Adicionar conta
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Loader2 className="inline size-4 mr-2 animate-spin" />
                  Carregando contas...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((account) => {
                const isSelf = account.user_id === currentUserId;
                const displayName =
                  account.profile_nome || account.nome || "—";
                const isBusy = busyEmail === account.email;
                return (
                  <TableRow key={account.email}>
                    <TableCell className="font-medium">
                      {account.email}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          você
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{displayName}</TableCell>
                    <TableCell>
                      <Select
                        value={account.role}
                        disabled={isBusy || (isSelf && account.role === "developer")}
                        onValueChange={(v) => handleRoleChange(account, v as DbRole)}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="developer">Desenvolvedor</SelectItem>
                          <SelectItem value="requester">Solicitante</SelectItem>
                          <SelectItem value="builder">Builder</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {account.user_id ? (
                        <Badge variant="outline" className={ROLE_BADGE[account.role]}>
                          <UserCog className="size-3 mr-1" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Aguardando 1º login
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isBusy || isSelf}
                        onClick={() => setPendingDelete(account)}
                        title={isSelf ? "Você não pode remover sua própria conta" : "Remover"}
                      >
                        {isBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Após cadastrar uma conta, o usuário precisa criar a senha pelo fluxo de login
        (link "Esqueci minha senha"). O papel é aplicado automaticamente no primeiro acesso.
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar conta autorizada</DialogTitle>
            <DialogDescription>
              O e-mail ficará pré-autorizado. O usuário precisa se cadastrar pelo fluxo padrão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input
                type="email"
                autoFocus
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="pessoa@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Nome (opcional)</Label>
              <Input
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                placeholder="Como aparecerá na listagem"
              />
            </div>
            <div className="space-y-1">
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as DbRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">Solicitante</SelectItem>
                  <SelectItem value="builder">Builder</SelectItem>
                  <SelectItem value="developer">Desenvolvedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {pendingDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta perderá o acesso ao aplicativo imediatamente. As demandas e soluções
              já criadas serão preservadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
