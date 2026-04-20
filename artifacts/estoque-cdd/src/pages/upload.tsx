import { useState, useCallback } from "react";
import { useUploadEstoque, useGetEstoqueUploadStatus } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Upload() {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: status, refetch: refetchStatus } = useGetEstoqueUploadStatus();
  
  const uploadMutation = useUploadEstoque({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Upload concluído",
          description: `${data.rowsProcessed} registros processados com sucesso.`,
        });
        setSelectedFile(null);
        refetchStatus();
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: "Não foi possível processar o arquivo. Verifique o formato.",
        });
      }
    }
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Apenas arquivos .csv ou .xlsx são permitidos.",
      });
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (base64) {
        uploadMutation.mutate({
          data: {
            fileName: selectedFile.name,
            fileBase64: base64
          }
        });
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Dados</h1>
          <p className="text-muted-foreground">Atualize a base de estoque do CDD através de planilhas.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Nova Carga de Estoque</CardTitle>
              <CardDescription>Faça upload de um arquivo .csv ou .xlsx atualizado do sistema logístico.</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!selectedFile ? (
                  <>
                    <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <p className="mb-2 text-sm font-medium">Arraste e solte seu arquivo aqui</p>
                    <p className="text-xs text-muted-foreground mb-6">Suporta .csv e .xlsx até 10MB</p>
                    
                    <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                      Procurar arquivo
                    </Button>
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                      onChange={handleChange}
                    />
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center text-center">
                    <FileType className="h-12 w-12 text-primary mb-4" />
                    <p className="font-medium text-sm mb-1 truncate max-w-[300px]">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mb-6">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleUpload} disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
                        ) : (
                          "Iniciar Upload"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Atual</CardTitle>
              <CardDescription>Última atualização</CardDescription>
            </CardHeader>
            <CardContent>
              {status ? (
                status.uploadedAt ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Base Atualizada</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Arquivo:</span>
                        <span className="font-medium truncate max-w-[120px]">{status.fileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data:</span>
                        <span className="font-medium">
                          {format(new Date(status.uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Registros:</span>
                        <span className="font-medium">{status.totalRows?.toLocaleString('pt-BR')} SKUs</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-6">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Nenhum dado carregado</p>
                    <p className="text-xs text-muted-foreground mt-1">Faça o upload do primeiro arquivo.</p>
                  </div>
                )
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
