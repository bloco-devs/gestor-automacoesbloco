import { useState } from "react";
import { Loader2, Mail, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  formatarTelefoneBR,
  normalizarTelefoneBR,
  useSalvarWhatsapp,
  useWhatsapp,
} from "@/modules/notificacao-whatsapp";
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

/**
 * O WHATSAPP NESTA TELA NÃO É CONVENIÊNCIA — É O DESCADASTRO.
 *
 * Toda mensagem do Blink termina com o link para cá. Sem este cartão, o
 * "para parar de receber" de cada mensagem apontaria para uma tela que não
 * deixa parar.
 *
 * Opt-in: desligado por padrão, e ligar exige o número. O interruptor só liga
 * de verdade quando há um número válido; até lá ele abre o campo e espera.
 */
function CartaoWhatsapp() {
  const { data: w, isLoading } = useWhatsapp();
  const salvar = useSalvarWhatsapp();
  const [querLigar, setQuerLigar] = useState(false);
  const [numero, setNumero] = useState<string | null>(null);

  const ativo = !!w?.whatsapp_ativo;
  const valorCampo = numero ?? (w?.whatsapp_telefone ? formatarTelefoneBR(w.whatsapp_telefone) : "");
  const normalizado = normalizarTelefoneBR(valorCampo);
  const invalido = valorCampo.trim() !== "" && !normalizado;
  const mostrarCampo = ativo || querLigar;
  const numeroMudou = ativo && normalizado !== null && normalizado !== w?.whatsapp_telefone;

  const ligar = () =>
    salvar.mutate(
      { ativo: true, telefone: normalizado },
      { onSuccess: () => { setQuerLigar(false); setNumero(null); } },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5" aria-hidden />
          WhatsApp
        </CardTitle>
        <CardDescription>
          O Blink te avisa cada vez que uma solicitação sua muda de etapa, até a conclusão — e na
          conclusão, conta o que foi feito.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="pref-whats-ativo" className="font-medium">
            Receber avisos pelo WhatsApp
          </Label>
          <Switch
            id="pref-whats-ativo"
            checked={ativo || querLigar}
            disabled={isLoading || salvar.isPending}
            onCheckedChange={(v) => {
              if (!v) {
                setQuerLigar(false);
                if (ativo) salvar.mutate({ ativo: false });
              } else if (normalizado) {
                ligar();
              } else {
                setQuerLigar(true);
              }
            }}
          />
        </div>

        {mostrarCampo && (
          <div className="space-y-1.5">
            <Label htmlFor="pref-whats-numero" className="text-sm">
              Número do WhatsApp
            </Label>
            <div className="flex gap-2">
              <Input
                id="pref-whats-numero"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 98765-4321"
                value={valorCampo}
                onChange={(e) => setNumero(e.target.value)}
                aria-invalid={invalido || undefined}
                disabled={salvar.isPending}
              />
              {(!ativo || numeroMudou) && (
                <Button type="button" onClick={ligar} disabled={!normalizado || salvar.isPending}>
                  {ativo ? "Salvar" : "Ativar"}
                </Button>
              )}
            </div>
            {invalido && (
              <p className="text-xs text-destructive">Use DDD + número, por exemplo (11) 98765-4321.</p>
            )}
            {ativo && w?.whatsapp_consentido_em && !numeroMudou && (
              <p className="text-xs text-muted-foreground">
                Ativo desde {new Date(w.whatsapp_consentido_em).toLocaleDateString("pt-BR")}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
          Escolha como você quer acompanhar as suas solicitações.
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

      <CartaoWhatsapp />

      <p className="text-xs text-muted-foreground">
        Os avisos por email vão para o email da sua conta. Mudanças valem para as próximas solicitações e
        para as que já estão em andamento.
      </p>
    </div>
  );
}
