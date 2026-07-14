import { useRef } from "react";
import { Upload, FileJson, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  file: File | null;
  onFile: (f: File | null) => void;
}

export function StepUpload({ file, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Envie o arquivo exportado do Trello. Aceitamos <code>.json</code> (quadro único) e{" "}
        <code>.zip</code> (exportação de workspace). Tamanho máximo: 50 MB.
      </p>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition"
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        {file ? (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              {file.name.toLowerCase().endsWith(".zip") ? (
                <FileArchive className="h-4 w-4" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              {file.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Clique para selecionar ou arraste um arquivo aqui
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".json,.zip,application/json,application/zip"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {file ? (
        <Button variant="ghost" size="sm" onClick={() => onFile(null)}>
          Trocar arquivo
        </Button>
      ) : null}
    </div>
  );
}
