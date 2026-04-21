import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { UploadCard, type UploadStatus } from "@/components/upload-card";
import { Separator } from "@/components/ui/separator";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { useAuth } from "@/lib/auth-context";
import { getSupabaseAccessToken } from "@/lib/supabase";
import {
  encodeFileAsBase64,
  uploadFileToStorage,
} from "@/lib/storage-upload";

const API_BASE_URL = getApiBaseUrl();

type UploadEndpointConfig = {
  processPath: string;
  statusPath: string;
  storageCategory: string;
};

function useManagedUpload(
  config: UploadEndpointConfig,
  enabled: boolean,
) {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<UploadStatus | undefined>(undefined);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    if (!enabled) {
      setStatus(undefined);
      setIsStatusLoading(false);
      return;
    }

    setIsStatusLoading(true);

    try {
      const token = await getSupabaseAccessToken();
      const res = await fetch(`${API_BASE_URL}${config.statusPath}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.ok) {
        setStatus((await res.json()) as UploadStatus);
      } else {
        setStatus(undefined);
      }
    } catch {
      setStatus(undefined);
    } finally {
      setIsStatusLoading(false);
    }
  }, [config.statusPath, enabled]);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);

      try {
        let requestBody:
          | { fileName: string; storageBucket: string; storagePath: string }
          | { fileName: string; fileBase64: string };

        try {
          requestBody = await uploadFileToStorage(config.storageCategory, file);
        } catch (storageError) {
          if (!import.meta.env.DEV) {
            throw storageError;
          }

          requestBody = {
            fileName: file.name,
            fileBase64: await encodeFileAsBase64(file),
          };
        }

        const token = await getSupabaseAccessToken();
        const res = await fetch(`${API_BASE_URL}${config.processPath}`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(requestBody),
        });

        const data = (await res.json()) as {
          rowsProcessed?: number;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Falha ao processar o arquivo.");
        }

        toast({
          title: "Upload concluído",
          description: `${data.rowsProcessed ?? 0} registros importados com sucesso.`,
        });
        await fetchStatus();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível processar o arquivo.";

        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: message,
        });
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [config.processPath, config.storageCategory, fetchStatus, toast],
  );

  return {
    isUploading,
    status,
    isStatusLoading,
    upload,
    fetchStatus,
  };
}

function BaseSection({
  endpoint,
  title,
  description,
}: {
  endpoint: string;
  title: string;
  description: string;
}) {
  const { user, isLoading } = useAuth();
  const { isUploading, status, isStatusLoading, upload, fetchStatus } =
    useManagedUpload(
      {
        processPath: `/api/bases/${endpoint}/upload`,
        statusPath: `/api/bases/${endpoint}/status`,
        storageCategory: `bases/${endpoint}`,
      },
      Boolean(user) && !isLoading,
    );

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return (
    <UploadCard
      title={title}
      description={description}
      status={status}
      isStatusLoading={isStatusLoading}
      isUploading={isUploading}
      onUpload={upload}
      onRefetch={fetchStatus}
    />
  );
}

export default function Upload() {
  const { user, isLoading } = useAuth();
  const { isUploading, status, isStatusLoading, upload, fetchStatus } =
    useManagedUpload(
      {
        processPath: "/api/estoque/upload",
        statusPath: "/api/estoque/upload-status",
        storageCategory: "estoque",
      },
      Boolean(user) && !isLoading,
    );

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Dados</h1>
          <p className="text-muted-foreground">
            Atualize as bases do CDD Maceió. Cada seção corresponde a um tipo
            de arquivo do sistema logístico.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-base font-semibold">
              Base Estoque (Consulta Pública)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UploadCard
              title="base_estoque"
              description="Snapshot principal do estoque para a consulta pública. Substitui o snapshot anterior ao importar."
              status={status}
              isStatusLoading={isStatusLoading}
              isUploading={isUploading}
              onUpload={upload}
              onRefetch={fetchStatus}
            />
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <h2 className="text-base font-semibold">
              Classificação de Produtos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BaseSection
              endpoint="segmentos"
              title="classificacao_segmentos"
              description="Mapeamento de código Promax -> Segmento. Colunas obrigatórias: codigo_produto (Promax), segmento (ex: NAB, Choop, Alto Giro, Match...). Substitui toda a classificação anterior."
            />
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h2 className="text-base font-semibold">
              Bases do Sistema Logístico
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BaseSection
              endpoint="grade"
              title="base_grade"
              description="Grade de estoque por produto. Colunas: CodigoProduto, DescricaoProduto, UnidadeMedida, GradeEstoque, GradeCadastrada, Reserva, Saida, SaldoDisponivel."
            />
            <BaseSection
              endpoint="0111"
              title="base_0111"
              description="Cadastro mestre de produtos. Colunas: Código, Descrição, Marca, Embalagem, NCM, EAN, Fator, PGV e demais campos de produto."
            />
            <BaseSection
              endpoint="agendados"
              title="base_agendados"
              description="Pedidos agendados com itens. Colunas: Número pedido, Cliente, Produto, Situação, Valor, Vendedor, Município, NF e demais campos de pedido."
            />
            <BaseSection
              endpoint="exemplo"
              title="base_exemplo"
              description="Cadastro de colaboradores e ajudantes. Colunas: Id Promax, Nome, CPF, Crachá, Setor, Turno, Prestador, Metas de Pallet."
            />
            <BaseSection
              endpoint="020501"
              title="base_020501"
              description="Movimentação de estoque (Relatório 020501). Colunas: Data, Documento, Item, Depósito, Operação, Entradas, Saídas, Turno, Histórico."
            />
            <BaseSection
              endpoint="020502"
              title="base_020502"
              description="Saldo de estoque por depósito (Relatório 020502). Colunas: Armazém, Depósito, Produto, Saldos, Entradas, Saídas, Disponível, Grade Real."
            />
            <BaseSection
              endpoint="producao"
              title="base_producao"
              description="Produção T1 (arquivo .xlsx). Colunas: Date, DescricaoUnidade, CodSAP, DescrProdAbreviada, Embalagem, Fator RA24."
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
