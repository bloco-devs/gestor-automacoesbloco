import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSlaPolicies, useUpdateSlaPolicy } from "@/modules/dashboard";
import { PRIORITY_META, type DemandPriority } from "@/modules/demands/types";

export default function SLAPolicies() {
  const { user } = useAuth();
  const { data: policies, isLoading } = useSlaPolicies();
  const update = useUpdateSlaPolicy();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (policies) {
      setDraft(
        Object.fromEntries(policies.map((p) => [p.id, String(p.resolution_time_hours)])),
      );
    }
  }, [policies]);

  const canEdit = !!user?.isAdministrador;

  async function handleSave(id: string) {
    const raw = draft[id];
    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast({ title: "Valor inválido", description: "Informe um número de horas maior que zero.", variant: "destructive" });
      return;
    }
    try {
      await update.mutateAsync({ id, hours });
      toast({ title: "Política atualizada", description: `Novo prazo: ${hours}h.` });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuração de SLA</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste o tempo de resolução (em horas) por prioridade. Novas demandas usarão automaticamente estes valores.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Políticas por Prioridade</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Tempo de Resolução (horas)</TableHead>
                  <TableHead>Última atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(policies ?? []).map((p) => {
                  const meta = PRIORITY_META[p.priority as DemandPriority];
                  const original = String(p.resolution_time_hours);
                  const current = draft[p.id] ?? original;
                  const dirty = current !== original;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Badge variant="outline" className={meta?.className}>
                          {meta?.label ?? p.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="max-w-[140px]"
                          value={current}
                          disabled={!canEdit}
                          onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.updated_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!canEdit || !dirty || update.isPending}
                          onClick={() => handleSave(p.id)}
                        >
                          Salvar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!canEdit && (
            <p className="mt-4 text-xs text-muted-foreground">
              Somente administradores podem alterar as políticas de SLA.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
