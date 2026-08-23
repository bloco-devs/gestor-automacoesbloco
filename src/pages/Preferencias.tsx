import { Loader2, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  usePreferenciasEmail,
  useSalvarPreferenciasEmail,
  type PreferenciasEmail,
} from "@/modules/notificacao-email";

interface LinhaProps {
  id: keyof PreferenciasEmail;
  titulo: string;
  /** O que a pessoa vai receber, escrito como ela vai ler na caixa de entrada. */
  exemplo: string;
  marcado: boolean;
  desabilitado?: boolean;
  aoMudar: (v: boolean) => void;
}

function Linha({ id, titulo, exemplo, marcado, desabilitado, aoMudar }: LinhaProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className={desabilitado ? "text-muted-foreground" : ""}>
          {titulo}
        </Label>
        {/* Mostrar o assunto real economiza a pergunta "mas o que chega?". */}
        <p className="text-sm text-muted-foreground">{exemplo}</p>
      </div>
      <Switch id={id} checked={marcado} disabled={desabilitado} onCheckedChange={aoMudar} />
    </div>
  );
}

export default function Preferencias() {
  const { data: prefs, isLoading } = usePreferenciasEmail();
  const salvar = useSalvarPreferenciasEmail();

  if (isLoading || !prefs) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const desligado = !prefs.email_ativo;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Preferências</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o que você quer receber por email sobre as suas solicitações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" />
            Avisos por email
          </CardTitle>
          <CardDescription>
            Só avisamos quando muda alguma coisa que importa para você. Movimentos internos da
            equipe — triagem, testes, ajustes de prioridade — não geram email.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-start justify-between gap-4 pb-1">
            <div className="space-y-1">
              <Label htmlFor="email_ativo" className="text-base">
                Receber emails
              </Label>
              <p className="text-sm text-muted-foreground">
                Desligando aqui, você não recebe nenhum dos avisos abaixo.
              </p>
            </div>
            <Switch
              id="email_ativo"
              checked={prefs.email_ativo}
              onCheckedChange={(v) => salvar.mutate({ email_ativo: v })}
            />
          </div>

          <Separator className="my-2" />

          <Linha
            id="email_demanda_criada"
            titulo="Quando eu abrir uma solicitação"
            exemplo="“Recebemos sua solicitação” — o comprovante de que o pedido entrou."
            marcado={prefs.email_demanda_criada}
            desabilitado={desligado}
            aoMudar={(v) => salvar.mutate({ email_demanda_criada: v })}
          />

          <Linha
            id="email_mudanca_status"
            titulo="Quando a situação mudar"
            exemplo="“Entrou em desenvolvimento” · “Pronta para sua validação”"
            marcado={prefs.email_mudanca_status}
            desabilitado={desligado}
            aoMudar={(v) => salvar.mutate({ email_mudanca_status: v })}
          />

          <Linha
            id="email_concluida"
            titulo="Quando for concluída"
            exemplo="“Concluída” — o fim do assunto."
            marcado={prefs.email_concluida}
            desabilitado={desligado}
            aoMudar={(v) => salvar.mutate({ email_concluida: v })}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Os avisos vão para o email da sua conta. Mudanças valem para as próximas solicitações e
        para as que já estão em andamento.
      </p>
    </div>
  );
}
