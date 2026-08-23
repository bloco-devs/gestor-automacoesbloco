import { useState } from "react";
import { AlertTriangle, Play, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useFilaEmail,
  useProcessarFila,
  useReenviarEmail,
  type ItemFilaEmail,
  type SituacaoEnvio,
} from "@/modules/notificacao-email";

const ABAS: Array<{ valor: string; rotulo: string }> = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "pendente", rotulo: "Na fila" },
  { valor: "falhou", rotulo: "Falharam" },
  { valor: "enviado", rotulo: "Enviados" },
];

function Situacao({ item }: { item: ItemFilaEmail }) {
  if (item.situacao === "enviado") {
    return <Badge variant="secondary">Enviado</Badge>;
  }
  if (item.situacao === "pendente") {
    return (
      <Badge variant="outline">
        Na fila{item.tentativas > 0 ? ` · ${item.tentativas}ª tentativa` : ""}
      </Badge>
    );
  }
  if (item.situacao === "falhou") {
    // O motivo é a única coisa acionável quando um email não sai. Deixá-lo a
    // um hover de distância evita a viagem até os logs da edge function.
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="cursor-help gap-1">
            <AlertTriangle className="h-3 w-3" />
            Falhou
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="break-words text-xs">{item.ultimo_erro ?? "Sem detalhe registrado."}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  return <Badge variant="outline">Cancelado</Badge>;
}

function quando(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificacoesEmail() {
  const [aba, setAba] = useState<string>("todas");
  const situacao = aba === "todas" ? undefined : (aba as SituacaoEnvio);
  const { data, isLoading } = useFilaEmail(situacao);
  const processar = useProcessarFila();
  const reenviarUm = useReenviarEmail();

  const itens = data ?? [];
  const falhas = itens.filter((i) => i.situacao === "falhou").length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Avisos por email</h1>
          <p className="text-sm text-muted-foreground">
            O que o sistema mandou para os solicitantes, e o que não conseguiu mandar.
          </p>
        </div>
        <Button
          onClick={() => processar.mutate()}
          disabled={processar.isPending}
          variant="outline"
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          {processar.isPending ? "Processando…" : "Processar agora"}
        </Button>
      </div>

      {falhas > 0 && aba !== "falhou" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span>
              {falhas} aviso(s) não chegaram ao destinatário.{" "}
              <button className="underline underline-offset-2" onClick={() => setAba("falhou")}>
                Ver quais
              </button>
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          {ABAS.map((a) => (
            <TabsTrigger key={a.valor} value={a.valor}>
              {a.rotulo}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {itens.length} registro{itens.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : itens.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {aba === "falhou"
                ? "Nenhuma falha. É o que se espera."
                : "Nada aqui ainda."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitação</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Aviso</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Quando</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[22rem]">
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.dados.ticket_code ?? "—"}
                        </div>
                        <div className="truncate">{item.dados.titulo ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{item.destinatario_email}</TableCell>
                      <TableCell className="text-sm">
                        {item.evento === "demanda_criada"
                          ? "Recebemos sua solicitação"
                          : item.evento === "demanda_concluida"
                            ? "Concluída"
                            : (item.dados.rotulo ?? "Mudança de situação")}
                      </TableCell>
                      <TableCell>
                        <Situacao item={item} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {quando(item.enviado_em ?? item.created_at)}
                      </TableCell>
                      <TableCell>
                        {item.situacao === "falhou" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={reenviarUm.isPending}
                                onClick={() => reenviarUm.mutate(item.id)}
                              >
                                <RotateCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tentar de novo</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
