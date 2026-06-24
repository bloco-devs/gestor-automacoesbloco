import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, HelpCircle, Workflow, Users, Database } from "lucide-react";

export default function Ajuda() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <HelpCircle className="size-5" /> Central de ajuda
        </h1>
        <p className="text-sm text-muted-foreground">
          Tudo o que você precisa saber para tirar proveito do Gestor de Automações.
        </p>
      </div>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base">Perguntas frequentes</CardTitle>
          <CardDescription>Respostas rápidas para as dúvidas mais comuns.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="q1">
              <AccordionTrigger>Como cadastro uma demanda?</AccordionTrigger>
              <AccordionContent>
                No menu lateral, clique em <strong>Nova Solicitação</strong>. Preencha o título,
                a descrição e ajuste os critérios (frequência, dificuldade e retorno). Se quiser,
                use o assistente de IA para ajudar a redigir a descrição.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Como acompanho o status?</AccordionTrigger>
              <AccordionContent>
                Em <strong>Minhas Solicitações</strong> você vê todas as suas demandas e o status
                atual de cada uma. Ao clicar em uma demanda, abre a tela de detalhes com a linha
                do tempo do andamento.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>O que significa cada status do Kanban?</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Novo</strong>: demanda recém cadastrada, aguardando triagem.</li>
                  <li><strong>Em Análise</strong>: o desenvolvedor está avaliando viabilidade e complexidade.</li>
                  <li><strong>Em Desenvolvimento</strong>: a solução já está sendo construída.</li>
                  <li><strong>Pronto</strong>: a solução foi entregue.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>Como troco de perfil?</AccordionTrigger>
              <AccordionContent>
                Se a sua conta tiver mais de um perfil, use o botão de troca de perfil no rodapé
                da barra lateral. Você é redirecionado para escolher entre as opções disponíveis.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" /> O que cada função faz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium">Solicitante</h3>
            <p className="text-muted-foreground">
              Cadastra novas demandas, acompanha o status de cada uma e recebe notificações
              quando há avanço.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Desenvolvedor</h3>
            <p className="text-muted-foreground">
              Vê o dashboard de priorização, organiza o pipeline no Kanban
              (<em>Novo → Em Análise → Em Desenvolvimento → Pronto</em>), cadastra soluções e
              mantém o diagrama de integrações.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Priorização</h3>
            <p className="text-muted-foreground">
              As demandas são ordenadas por um <strong>score</strong> calculado a partir de
              frequência, dificuldade e retorno. O score final é ajustado depois que o
              desenvolvedor avalia a complexidade técnica.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="size-4" /> De onde vêm os dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• As demandas são cadastradas pelos próprios solicitantes.</p>
          <p>• O assistente de descrição usa <strong>IA</strong> para ajudar a redigir a demanda.</p>
          <p>
            • A priorização é calculada por um <strong>score</strong> (fórmula a partir de
            frequência, dificuldade e retorno; o score final é ajustado pela complexidade
            técnica avaliada pelo desenvolvedor).
          </p>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="size-4" /> Fale com o suporte
          </CardTitle>
          <CardDescription>Não encontrou o que procurava?</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-muted-foreground">
            Envie um e-mail para a equipe de suporte e descreva o que está acontecendo:
          </p>
          <p className="mt-2 inline-flex items-center gap-2 font-medium">
            <Mail className="size-4 text-muted-foreground" />
            <a className="text-accent hover:underline" href="mailto:suporte@bloco">suporte@bloco</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
