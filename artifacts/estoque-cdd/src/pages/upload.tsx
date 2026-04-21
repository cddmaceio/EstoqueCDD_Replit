import { useState, useEffect } from "react";
import { useUploadEstoque, useGetEstoqueUploadStatus } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useToast } from "@/hooks/use-toast";
import { UploadCard, type UploadStatus } from "@/components/upload-card";
import { Separator } from "@/components/ui/separator";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function useBaseUpload(endpoint: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<UploadStatus | undefined>(undefined);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatus = async () => {
    setIsStatusLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bases/${endpoint}/status`, { credentials: "include" });
      if (res.ok) setStatus(await res.json());
    } catch {}
    setIsStatusLoading(false);
  };

  const upload = async (fileName: string, fileBase64: string) => {
    setIsUploading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bases/${endpoint}/upload`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileBase64 }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Upload concluído", description: `${data.rowsProcessed} registros importados com sucesso.` });
        fetchStatus();
      } else {
        toast({ variant: "destructive", title: "Erro no upload", description: data.error ?? "Falha ao processar o arquivo." });
      }
    } catch {
      toast({ variant: "destructive", title: "Erro de conexão", description: "Não foi possível conectar ao servidor." });
    }
    setIsUploading(false);
  };

  return { isUploading, status, isStatusLoading, upload, fetchStatus };
}

function BaseSection({ endpoint, title, description }: { endpoint: string; title: string; description: string }) {
  const { isUploading, status, isStatusLoading, upload, fetchStatus } = useBaseUpload(endpoint);
  useEffect(() => { fetchStatus(); }, []);
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
  const { toast } = useToast();

  const { data: estoqueStatus, isLoading: estoqueStatusLoading, refetch: refetchEstoqueStatus } = useGetEstoqueUploadStatus();
  const uploadEstoque = useUploadEstoque({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Upload concluído", description: `${data.rowsProcessed} registros processados.` });
        refetchEstoqueStatus();
      },
      onError: () => {
        toast({ variant: "destructive", title: "Erro no upload", description: "Não foi possível processar o arquivo." });
      },
    },
  });

  const handleEstoqueUpload = (fileName: string, fileBase64: string) => {
    uploadEstoque.mutate({ data: { fileName, fileBase64 } });
  };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Dados</h1>
          <p className="text-muted-foreground">
            Atualize as bases do CDD Maceió. Cada seção corresponde a um tipo de arquivo do sistema logístico.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-base font-semibold">Base Estoque (Consulta Pública)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UploadCard
              title="base_estoque"
              description="Snapshot principal do estoque para a consulta pública. Substitui o snapshot anterior ao importar."
              status={estoqueStatus ? { fileName: estoqueStatus.fileName ?? null, uploadedAt: estoqueStatus.uploadedAt ?? null, totalRows: estoqueStatus.totalRows ?? null } : undefined}
              isStatusLoading={estoqueStatusLoading}
              isUploading={uploadEstoque.isPending}
              onUpload={handleEstoqueUpload}
              onRefetch={() => refetchEstoqueStatus()}
            />
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            <h2 className="text-base font-semibold">Classificação de Produtos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <BaseSection
              endpoint="segmentos"
              title="classificacao_segmentos"
              description="Mapeamento de código Promax → Segmento. Colunas obrigatórias: codigo_produto (Promax), segmento (ex: NAB, Chopp, Alto Giro, Match…). Substitui toda a classificação anterior."
            />
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <h2 className="text-base font-semibold">Bases do Sistema Logístico</h2>
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
              description="Saldo de estoque por depósito (Relatório 020502). Colunas: Armazem, Depósito, Produto, Saldos, Entradas, Saídas, Disponível, Grade Real."
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
