import { memo } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIAS_PARA_PARADA, RISCO_ROTULO, semelhantes, type Demanda, type Resumo } from "@/domain/demand";

/**
 * Copiloto — analista, não chatbot.
 *
 * Não tem caixa de texto, não pergunta "como posso ajudar?", não guarda
 * histórico de conversa. Ele responde quatro perguntas que quem abre a tela já
 * tem na cabeça: como estamos, por onde começo, o que está travando, e quem
 * está sobrecarregado.
 *
 * REGRA: nunca vazio. Quando não há risco, o topo diz que está saudável —
 * estado saudável também é resposta, e um painel em branco faz o usuário achar
 * que quebrou.
 *
 * Tudo aqui é derivado dos dados já carregados (SLA, estagnação, ausência de
 * responsável, sobreposição de título). Nenhuma chamada de IA e nenhum número
 * inventado. Quando o modelo entrar, ele substitui o texto do bloco "Resumo" —
 * a estrutura não muda, então a interface não acende quando a IA funciona nem
 * apaga quando ela falha.
 */

interface Props {
  demandas: Demanda[];
  resumo: Resumo;
  onAbrir: (id: string) => void;
  className?: string;
}

function Bloco({ titulo, contagem, children }: { titulo: string; contagem?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="ds-label flex items-center gap-1.5 text-muted-foreground">
        {titulo}
        {typeof contagem === "number" && (
          <span className="ds-caption tabular-nums text-muted-foreground/70">{contagem}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function Item({
  demanda,
  detalhe,
  tom,
  onAbrir,
}: {
  demanda: Demanda;
  detalhe: string;
  tom?: "risco" | "atencao";
  onAbrir: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(demanda.id)}
      aria-label={`Abrir demanda ${demanda.titulo}`}
      className="group -mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-fast hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          tom === "risco" ? "bg-destructive" : tom === "atencao" ? "bg-warning" : "bg-muted-foreground/40",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="ds-caption block truncate text-foreground">{demanda.titulo}</span>
        <span className="ds-caption block truncate text-muted-foreground">{detalhe}</span>
      </span>
      <ArrowRight
        className="mt-1 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-fast group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}

function CopilotoImpl({ demandas, resumo, onAbrir, className }: Props) {
  const abertas = demandas.filter((d) => !d.concluida);
  const criticas = abertas.filter((d) => d.risco === "sla_estourado" || d.risco === "atrasada").slice(0, 4);
  const paradas = abertas
    .filter((d) => d.risco === "parada")
    .sort((a, b) => b.diasParada - a.diasParada)
    .slice(0, 3);
  const semDono = abertas.filter((d) => d.responsaveis.length === 0).slice(0, 3);

  // Duplicidade provável: pares de títulos sobrepostos. Mesma heurística da
  // prevenção de chamados duplicados, aplicada dentro do recorte atual.
  const duplicadas: Array<[Demanda, Demanda]> = [];
  const vistas = new Set<string>();
  for (const d of abertas) {
    if (vistas.has(d.id) || duplicadas.length >= 2) continue;
    const [par] = semelhantes(d, abertas, 1);
    if (par && !vistas.has(par.id)) {
      duplicadas.push([d, par]);
      vistas.add(d.id);
      vistas.add(par.id);
    }
  }

  return (
    <aside aria-label="Blink — panorama do projeto" className={cn("space-y-7 border-l border-border/60 px-5 py-5", className)}>
      <Bloco titulo="Como está">
        <p className="ds-caption text-muted-foreground">
          {resumo.saudavel ? (
            <>
              Tudo sob controle: {resumo.abertas} aberta{resumo.abertas === 1 ? "" : "s"}, sem atrasos e todas com
              responsável.
            </>
          ) : (
            <>
              {resumo.abertas} aberta{resumo.abertas === 1 ? "" : "s"}
              {resumo.emRisco > 0 && <> · {resumo.emRisco} em risco</>}
              {resumo.slaEstourado > 0 && <> · {resumo.slaEstourado} com SLA estourado</>}
              {resumo.semResponsavel > 0 && <> · {resumo.semResponsavel} sem responsável</>}.
            </>
          )}
        </p>
      </Bloco>

      <Bloco titulo="Comece por aqui">
        {resumo.maiorRisco ? (
          <Item
            demanda={resumo.maiorRisco}
            tom={resumo.maiorRisco.risco ? "risco" : undefined}
            detalhe={[
              resumo.maiorRisco.status.rotulo,
              resumo.maiorRisco.risco ? RISCO_ROTULO[resumo.maiorRisco.risco] : null,
              resumo.maiorRisco.responsaveis[0]?.nome ?? "sem responsável",
            ]
              .filter(Boolean)
              .join(" · ")}
            onAbrir={onAbrir}
          />
        ) : (
          <p className="ds-caption text-muted-foreground">Nenhuma demanda aberta nesta fila.</p>
        )}
      </Bloco>

      {criticas.length > 0 && (
        <Bloco titulo="Vencidas" contagem={resumo.atrasadas + resumo.slaEstourado}>
          <div className="space-y-0.5">
            {criticas.map((d) => (
              <Item
                key={d.id}
                demanda={d}
                tom="risco"
                detalhe={d.prazo ? `Prazo em ${new Date(d.prazo).toLocaleDateString("pt-BR")}` : d.status.rotulo}
                onAbrir={onAbrir}
              />
            ))}
          </div>
        </Bloco>
      )}

      {paradas.length > 0 && (
        <Bloco titulo="Sem movimentação" contagem={resumo.paradas}>
          <div className="space-y-0.5">
            {paradas.map((d) => (
              <Item
                key={d.id}
                demanda={d}
                tom="atencao"
                detalhe={`Parada há ${d.diasParada} dias · ${d.status.rotulo}`}
                onAbrir={onAbrir}
              />
            ))}
          </div>
          <p className="ds-caption pt-1 text-muted-foreground/70">
            Considera parada após {DIAS_PARA_PARADA} dias sem alteração.
          </p>
        </Bloco>
      )}

      {semDono.length > 0 && (
        <Bloco titulo="Sem responsável" contagem={resumo.semResponsavel}>
          <div className="space-y-0.5">
            {semDono.map((d) => (
              <Item key={d.id} demanda={d} detalhe={d.status.rotulo} onAbrir={onAbrir} />
            ))}
          </div>
        </Bloco>
      )}

      {resumo.proximaEntrega && (
        <Bloco titulo="Próxima entrega">
          <p className="ds-caption text-muted-foreground">
            {new Date(resumo.proximaEntrega.data).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
            })}{" "}
            · {resumo.proximaEntrega.quantidade} demanda
            {resumo.proximaEntrega.quantidade === 1 ? "" : "s"}
          </p>
        </Bloco>
      )}

      {resumo.carga.length > 0 && (
        <Bloco titulo="Carga da equipe">
          <dl className="space-y-1.5">
            {resumo.carga.slice(0, 5).map((c) => {
              const maximo = resumo.carga[0].abertas || 1;
              return (
                <div key={c.pessoa.id} className="flex items-center gap-2 ds-caption">
                  <dt className="w-20 shrink-0 truncate text-muted-foreground">{c.pessoa.nome}</dt>
                  <dd className="flex flex-1 items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span
                        className={cn("block h-full rounded-full", c.emRisco > 0 ? "bg-warning" : "bg-foreground/50")}
                        style={{ width: `${Math.round((c.abertas / maximo) * 100)}%` }}
                      />
                    </span>
                    <span className="w-4 shrink-0 text-right tabular-nums">{c.abertas}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </Bloco>
      )}

      {duplicadas.length > 0 && (
        <Bloco titulo="Possível duplicidade">
          <div className="space-y-2">
            {duplicadas.map(([a, b]) => (
              <div key={a.id} className="space-y-0.5">
                <Item demanda={a} detalhe={a.status.rotulo} onAbrir={onAbrir} />
                <Item demanda={b} detalhe={`Parece a mesma coisa · ${b.status.rotulo}`} onAbrir={onAbrir} />
              </div>
            ))}
          </div>
        </Bloco>
      )}
    </aside>
  );
}

export const Copiloto = memo(CopilotoImpl);
