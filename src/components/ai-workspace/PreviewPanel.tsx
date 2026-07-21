import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { ScorePill } from "@/components/ScorePill";
import { TIPO_DEMANDA_LABEL, type TipoDemanda } from "@/lib/types";
import type { AiPreview } from "@/hooks/useAIWorkspace";
import { complexidadeLabel, impactoFor, prioridadeLabel } from "@/hooks/useAIWorkspace";
import type { SistemaAlvoOption } from "@/hooks/useEcossistemaSistemas";

interface Props {
  preview: AiPreview;
  score: number;
  setores: string[];
  sistemas: SistemaAlvoOption[];
  onChange: (patch: Partial<AiPreview>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onBackToChat: () => void;
  submitting: boolean;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export const PreviewPanel = memo(function PreviewPanel({
  preview,
  score,
  setores,
  sistemas,
  onChange,
  onConfirm,
  onCancel,
  onBackToChat,
  submitting,
}: Props) {
  const [editing, setEditing] = useState(false);
  const sistemaNome = preview.sistemaAlvoSlug
    ? sistemas.find((s) => s.id === preview.sistemaAlvoSlug)?.nome ?? preview.sistemaAlvoSlug
    : "—";

  return (
    <Card className="surface-1">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Preview da solicitação</CardTitle>
            <DataSourceBadge source="IA" />
          </div>
          <p className="text-xs text-muted-foreground">
            Revise as informações inferidas pela IA antes de confirmar.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing((v) => !v)}
          aria-label={editing ? "Concluir edição" : "Editar campos"}
        >
          <Pencil className="size-3.5" /> {editing ? "Concluir edição" : "Editar"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Título */}
        {editing ? (
          <div className="space-y-1.5">
            <Label htmlFor="prev-titulo">Título</Label>
            <Input
              id="prev-titulo"
              value={preview.titulo}
              onChange={(e) => onChange({ titulo: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Título</div>
            <h3 className="text-lg font-semibold leading-snug">{preview.titulo}</h3>
          </div>
        )}

        {/* Resumo/descrição */}
        {editing ? (
          <div className="space-y-1.5">
            <Label htmlFor="prev-desc">Resumo</Label>
            <Textarea
              id="prev-desc"
              rows={5}
              value={preview.descricao}
              onChange={(e) => onChange({ descricao: e.target.value })}
            />
          </div>
        ) : (
          <Field
            label="Resumo"
            value={
              <p className="whitespace-pre-wrap text-sm font-normal leading-relaxed text-foreground/90">
                {preview.descricao}
              </p>
            }
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sistema */}
          {editing ? (
            <div className="space-y-1.5">
              <Label>Sistema</Label>
              <Select
                value={preview.sistemaAlvoSlug ?? "__none__"}
                onValueChange={(v) => onChange({ sistemaAlvoSlug: v === "__none__" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— nenhum —</SelectItem>
                  {sistemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Field label="Sistema" value={sistemaNome} />
          )}

          {/* Categoria (tipo_demanda) */}
          {editing ? (
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={preview.tipoDemanda ?? "__none__"}
                onValueChange={(v) =>
                  onChange({ tipoDemanda: v === "__none__" ? null : (v as TipoDemanda) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— nenhuma —</SelectItem>
                  {(Object.keys(TIPO_DEMANDA_LABEL) as TipoDemanda[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_DEMANDA_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Field
              label="Categoria"
              value={preview.tipoDemanda ? TIPO_DEMANDA_LABEL[preview.tipoDemanda] : "—"}
            />
          )}

          {/* Setor */}
          {editing ? (
            <div className="space-y-1.5">
              <Label>Setor</Label>
              <Select value={preview.setor || undefined} onValueChange={(v) => onChange({ setor: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Field label="Setor" value={preview.setor || "—"} />
          )}

          <Field
            label="Prioridade estimada"
            value={
              <span className="inline-flex items-center gap-2">
                <span className="tabular-nums">{score}/100</span>
                <ScorePill score={score} />
                <span className="text-xs text-muted-foreground">{prioridadeLabel(score)}</span>
              </span>
            }
          />
          <Field label="Impacto" value={impactoFor(preview.retorno)} />
          <Field
            label="Complexidade"
            value={`${complexidadeLabel(preview.complexidadeDev)} · ${preview.complexidadeDev}/10`}
          />
        </div>

        {/* Tags */}
        {preview.tags.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {preview.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[11px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Similares */}
        {preview.similares.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Demandas semelhantes</p>
              <DataSourceBadge source="IA" />
            </div>
            <ul className="space-y-1.5">
              {preview.similares.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    to={`/solicitacao/${s.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {s.titulo} <ExternalLink className="size-3" />
                  </Link>
                  <Badge variant="outline" className="text-[10px]">
                    {s.similaridade}% parecida
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Responsável sugerido" value={preview.responsavelSugerido} />

        {preview.justificativa && (
          <p className="rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs leading-snug text-muted-foreground">
            <span className="font-medium text-foreground/70">Justificativa da IA: </span>
            {preview.justificativa}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            <XCircle className="size-4" /> Cancelar
          </Button>
          <Button variant="outline" onClick={onBackToChat} disabled={submitting}>
            Voltar à conversa
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Confirmar solicitação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
