import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  cancelImportJob,
  fetchJob,
  runImportJob,
  subscribeJob,
  uploadImportFile,
} from "@/lib/importador/api";
import { detectBoardsFromFile } from "@/lib/importador/detect";
import type {
  CardConflictStrategy,
  DetectedFile,
  ImportSelection,
  ImportTarget,
  JobRow,
  RunReport,
} from "@/lib/importador/types";
import { DEFAULT_SELECTION } from "@/lib/importador/types";
import { WizardStepper, type WizardStepDef } from "@/components/atividades/importar/WizardStepper";
import { StepOrigem } from "@/components/atividades/importar/steps/StepOrigem";
import { StepUpload } from "@/components/atividades/importar/steps/StepUpload";
import { StepBoardOrigem } from "@/components/atividades/importar/steps/StepBoardOrigem";
import { StepDestino } from "@/components/atividades/importar/steps/StepDestino";
import { StepSelecao } from "@/components/atividades/importar/steps/StepSelecao";
import { StepDryRun } from "@/components/atividades/importar/steps/StepDryRun";
import { StepExecucao } from "@/components/atividades/importar/steps/StepExecucao";

const ALL_STEPS: WizardStepDef[] = [
  { key: "origem", label: "Origem" },
  { key: "upload", label: "Upload" },
  { key: "board", label: "Quadro de origem", optional: true },
  { key: "destino", label: "Destino" },
  { key: "selecao", label: "Conteúdo" },
  { key: "dryrun", label: "Dry-run" },
  { key: "final", label: "Relatório" },
];

const LAST_REAL_JOB_KEY = "atividades-import:last-real-job";

export default function ImportarQuadro() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [source] = useState<"trello">("trello");
  const [file, setFile] = useState<File | null>(null);
  const [detected, setDetected] = useState<DetectedFile | null>(null);
  const [boardExternalId, setBoardExternalId] = useState<string | null>(null);
  const [target, setTarget] = useState<ImportTarget>({ mode: "create_board" });
  const [selection, setSelection] = useState<ImportSelection>(DEFAULT_SELECTION);
  const [cardConflict, setCardConflict] = useState<CardConflictStrategy>("import_all");

  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [report, setReport] = useState<RunReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Execução real (fase 6) — job separado, gerado após o dry-run.
  const [realRunning, setRealRunning] = useState(false);
  const [realJobId, setRealJobId] = useState<string | null>(null);
  const [realJob, setRealJob] = useState<JobRow | null>(null);
  const [realReport, setRealReport] = useState<RunReport | null>(null);
  const [realBoardId, setRealBoardId] = useState<string | null>(null);
  const [realError, setRealError] = useState<string | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const savedJobId = window.localStorage.getItem(LAST_REAL_JOB_KEY);
    if (!savedJobId) return;
    fetchJob(savedJobId).then((r) => {
      if (!r) return;
      setRealJobId(r.id);
      setRealJob(r);
      setRealReport(r.report);
      setRealBoardId(r.board_id_local ?? r.report?.board_id_local ?? null);
      setStep(ALL_STEPS.length - 1);
    }).catch(() => {
      window.localStorage.removeItem(LAST_REAL_JOB_KEY);
    });
  }, []);

  // Detecta boards ao selecionar arquivo
  useEffect(() => {
    if (!file) {
      setDetected(null);
      setBoardExternalId(null);
      return;
    }
    let cancel = false;
    detectBoardsFromFile(file).then((d) => {
      if (cancel) return;
      setDetected(d);
      if (d.boards.length === 1) setBoardExternalId(d.boards[0].external_id);
      else setBoardExternalId(null);
    });
    return () => { cancel = true; };
  }, [file]);

  // Realtime do job (dry-run)
  useEffect(() => {
    if (!jobId) return;
    const un = subscribeJob(jobId, (row) => {
      setJob(row);
      if (row.report) setReport(row.report);
    });
    unsubRef.current = un;
    fetchJob(jobId).then((r) => { if (r) { setJob(r); if (r.report) setReport(r.report); } });
    return () => { un(); unsubRef.current = null; };
  }, [jobId]);

  // Realtime do job real (fase 6)
  useEffect(() => {
    if (!realJobId) return;
    const un = subscribeJob(realJobId, (row) => {
      setRealJob(row);
      if (row.report) setRealReport(row.report);
      setRealBoardId(row.board_id_local ?? row.report?.board_id_local ?? null);
    });
    fetchJob(realJobId).then((r) => {
      if (r) {
        setRealJob(r);
        if (r.report) setRealReport(r.report);
        setRealBoardId(r.board_id_local ?? r.report?.board_id_local ?? null);
      }
    });
    return () => { un(); };
  }, [realJobId]);

  const skipBoardStep = !!detected && detected.boards.length <= 1;
  const skipped = useMemo(() => new Set(skipBoardStep ? ["board"] : []), [skipBoardStep]);

  const goNext = () => {
    let next = step + 1;
    if (skipBoardStep && ALL_STEPS[next]?.key === "board") next++;
    setStep(Math.min(next, ALL_STEPS.length - 1));
  };
  const goPrev = () => {
    let prev = step - 1;
    if (skipBoardStep && ALL_STEPS[prev]?.key === "board") prev--;
    setStep(Math.max(prev, 0));
  };

  const currentKey = ALL_STEPS[step].key;

  const canAdvance = (): boolean => {
    switch (currentKey) {
      case "origem": return !!source;
      case "upload": return !!file;
      case "board": return !!boardExternalId || skipBoardStep;
      case "destino":
        if (target.mode === "existing_board") return !!target.board_id_local;
        return true;
      case "selecao": return true;
      case "dryrun": return !!report;
      default: return false;
    }
  };

  const handleUploadAndRun = async () => {
    if (!file) return;
    setError(null);
    setReport(null);
    setJob(null);
    try {
      let currentJobId = jobId;
      let currentPath = storagePath;
      if (!currentJobId || !currentPath) {
        setUploading(true);
        const up = await uploadImportFile({
          file,
          source,
          targetMode: target.mode,
          options: { source_board_external_id: boardExternalId ?? undefined },
        });
        setUploading(false);
        setJobId(up.job_id);
        setStoragePath(up.storage_path);
        currentJobId = up.job_id;
        currentPath = up.storage_path;
      }
      setRunning(true);
      const res = await runImportJob({
        job_id: currentJobId!,
        storage_path: currentPath!,
        target,
        selection,
        card_conflict: cardConflict,
        resolutions: { members: [] },
      });
      setRunning(false);
      setReport(res.report);
      toast.success(`Dry-run: ${res.status}`);
    } catch (e) {
      setUploading(false);
      setRunning(false);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      await cancelImportJob(jobId);
      toast.message("Cancelamento solicitado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao cancelar");
    }
  };

  // Executa a importação DEFINITIVA. Faz um novo upload (o arquivo do
  // dry-run já foi limpo pela edge function) e roda com dry_run=false.
  const handleExecuteReal = async () => {
    if (!file) return;
    setRealError(null);
    setRealReport(null);
    setRealJob(null);
    setRealBoardId(null);
    try {
      setRealRunning(true);
      const up = await uploadImportFile({
        file,
        source,
        targetMode: target.mode,
        options: { source_board_external_id: boardExternalId ?? undefined, dry_run: false },
      });
      setRealJobId(up.job_id);
      window.localStorage.setItem(LAST_REAL_JOB_KEY, up.job_id);
      const res = await runImportJob({
        job_id: up.job_id,
        storage_path: up.storage_path,
        target,
        selection,
        card_conflict: cardConflict,
        resolutions: { members: [] },
        dry_run: false,
      });
      setRealRunning(false);
      setRealReport(res.report);
      setRealBoardId(res.board_id_local ?? res.report.board_id_local ?? null);
      toast.success(`Importação: ${res.status}`);
    } catch (e) {
      setRealRunning(false);
      const msg = e instanceof Error ? e.message : String(e);
      setRealError(msg);
      toast.error(msg);
    }
  };

  const handleCancelReal = async () => {
    if (!realJobId) return;
    try { await cancelImportJob(realJobId); toast.message("Cancelamento solicitado"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao cancelar"); }
  };

  const handleFinish = () => {
    if (realBoardId) navigate(`/atividades/${realBoardId}`);
    else navigate("/atividades");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="text-sm text-muted-foreground">
        <button onClick={() => navigate("/atividades")} className="hover:underline">
          Atividades
        </button>
        <span aria-hidden className="mx-1.5">›</span>
        <span>Quadros</span>
        <span aria-hidden className="mx-1.5">›</span>
        <span className="text-foreground font-medium">Importar</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Importar quadro</h1>
          <p className="text-sm text-muted-foreground">
            RFC-001 · Fase 5 (Wizard) — apenas dry-run nesta fase.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/atividades")}>
          <X className="h-4 w-4 mr-1.5" /> Sair
        </Button>
      </div>

      <WizardStepper steps={ALL_STEPS} currentIndex={step} skipped={skipped} />

      <div className="border rounded-lg p-5 min-h-[280px]">
        {currentKey === "origem" && <StepOrigem value={source} onChange={() => { /* fixo por ora */ }} />}
        {currentKey === "upload" && <StepUpload file={file} onFile={setFile} />}
        {currentKey === "board" && (
          <StepBoardOrigem
            detected={detected}
            selectedExternalId={boardExternalId}
            onSelect={setBoardExternalId}
          />
        )}
        {currentKey === "destino" && <StepDestino target={target} onChange={setTarget} />}
        {currentKey === "selecao" && (
          <StepSelecao
            selection={selection}
            onSelection={setSelection}
            cardConflict={cardConflict}
            onCardConflict={setCardConflict}
          />
        )}
        {currentKey === "dryrun" && (
          <StepDryRun
            running={uploading || running}
            onRun={handleUploadAndRun}
            onCancel={handleCancel}
            job={job}
            report={report}
            error={error}
          />
        )}
        {currentKey === "final" && (
          <StepExecucao
            job={realJob ?? job}
            report={realReport ?? report}
            dryReport={report}
            realReport={realReport}
            realJob={realJob}
            realRunning={realRunning}
            realError={realError}
            realBoardId={realBoardId}
            onExecuteReal={handleExecuteReal}
            onCancelReal={handleCancelReal}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
        </Button>
        {currentKey === "final" ? (
          <Button onClick={handleFinish}>Concluir</Button>
        ) : (
          <Button onClick={goNext} disabled={!canAdvance()}>
            Avançar <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
