import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  ArticlesTable,
  ArticleFormDialog,
  MetricsStrip,
  useAdminArticles,
  knowledgeAdminService,
} from "@/modules/knowledge-admin";
import type { ArticleRow } from "@/modules/knowledge-admin/types";
import { EmptyState } from "@/components/EmptyState";
import { BookOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function BaseConhecimentoAdmin() {
  const { user } = useAuth();
  const { data: articles = [], isLoading, error } = useAdminArticles(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ArticleRow | null>(null);
  const qc = useQueryClient();

  const metrics = useMemo(() => knowledgeAdminService.computeMetrics(articles), [articles]);

  if (!user?.isAdministrador) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Base de Conhecimento</h1>
          <p className="text-sm text-muted-foreground">
            Crie, edite e publique artigos que ajudam os solicitantes a resolverem suas dúvidas sozinhos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["knowledge-admin"] })}>
            <RefreshCw className="size-4 mr-1" /> Atualizar
          </Button>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4 mr-1" /> Novo artigo
          </Button>
        </div>
      </header>

      <MetricsStrip metrics={metrics} />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando artigos…</div>
      ) : error ? (
        <EmptyState icon={BookOpen} title="Erro ao carregar" description={String(error)} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum artigo ainda"
          description="Comece criando seu primeiro artigo para a base de conhecimento."
          action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4 mr-1" /> Criar primeiro artigo</Button>}
        />
      ) : (
        <ArticlesTable articles={articles} onEdit={(a) => { setEditing(a); setOpen(true); }} />
      )}

      <ArticleFormDialog open={open} onOpenChange={setOpen} article={editing} />
    </div>
  );
}
