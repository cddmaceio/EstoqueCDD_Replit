import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface UploadStatus {
  fileName: string | null;
  uploadedAt: string | null;
  totalRows: number | null;
}

interface UploadCardProps {
  title: string;
  description: string;
  fileTypes?: string;
  status: UploadStatus | undefined;
  isStatusLoading: boolean;
  isUploading: boolean;
  onUpload: (file: File) => Promise<void> | void;
  onRefetch: () => void;
  accept?: string;
}

export function UploadCard({
  title,
  description,
  status,
  isStatusLoading,
  isUploading,
  onUpload,
  onRefetch,
  accept = ".csv,.xlsx",
  fileTypes = ".csv e .xlsx",
}: UploadCardProps) {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  }, []);

  const processFile = (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: `Apenas arquivos ${fileTypes} são aceitos.`,
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setTimeout(() => onRefetch(), 1000);
    } catch {
      // O toast de erro eh exibido pela tela chamadora.
    }
  };

  const hasData = status?.uploadedAt;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          {hasData ? (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Atualizado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground shrink-0">
              <AlertCircle className="h-3 w-3 mr-1" /> Aguardando
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1">
        {isStatusLoading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : hasData ? (
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 rounded-md px-3 py-2">
            <p className="truncate font-medium text-foreground">{status!.fileName}</p>
            <p>{format(new Date(status!.uploadedAt!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            <p>{status!.totalRows?.toLocaleString("pt-BR")} registros</p>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic bg-muted/30 rounded-md px-3 py-2">
            Nenhum arquivo carregado ainda.
          </div>
        )}

        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center py-5 px-3 cursor-pointer transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="h-7 w-7 text-muted-foreground mb-2" />
            <p className="text-xs font-medium text-center">Arraste ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fileTypes}</p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleChange}
            />
          </div>
        ) : (
          <div className="border rounded-md px-3 py-3 flex items-start gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Button
          size="sm"
          className="w-full mt-auto"
          disabled={!selectedFile || isUploading}
          onClick={handleUpload}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Processando...
            </>
          ) : (
            <>
              <UploadCloud className="h-3 w-3 mr-2" /> Enviar arquivo
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
