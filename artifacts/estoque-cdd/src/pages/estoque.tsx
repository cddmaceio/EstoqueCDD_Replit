import { useState, useEffect, useCallback, useRef } from "react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FilterX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface GradeItem {
  id: number;
  codigoProduto: number;
  descricaoProduto: string;
  unidadeMedida: string;
  gradeEstoque: number;
  gradeCadastrada: number;
  reserva: number;
  saida: number;
  saldoDisponivel: number;
  embalagem: string | null;
  tipoMarca: string | null;
  codigoProdutoSap: string | null;
}

interface GradeResponse {
  items: GradeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  snapshotDate: string | null;
}

interface Segmento {
  value: string;
  label: string;
}

function stripCode(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/^\d+\s*-\s*/, "").trim();
}

function useSegmentos() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  useEffect(() => {
    fetch(`${BASE_URL}/api/grade/consulta/segmentos`)
      .then((r) => r.json())
      .then((d) => setSegmentos(d.segmentos ?? []))
      .catch(() => {});
  }, []);
  return segmentos;
}

function useGradeConsulta(params: {
  search?: string;
  status?: string;
  segmento?: string;
  page: number;
  limit: number;
}) {
  const [data, setData] = useState<GradeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsFetching(true);
    try {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.status && params.status !== "all") query.set("status", params.status);
      if (params.segmento && params.segmento !== "all") query.set("segmento", params.segmento);
      query.set("page", String(params.page));
      query.set("limit", String(params.limit));

      const res = await fetch(`${BASE_URL}/api/grade/consulta?${query.toString()}`, {
        signal: controller.signal,
      });
      if (res.ok) setData(await res.json());
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== "AbortError") console.error(e);
    }
    setIsLoading(false);
    setIsFetching(false);
  }, [params.search, params.status, params.segmento, params.page, params.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isFetching, refetch: fetchData };
}

export default function Estoque() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState<string>("all");
  const [segmento, setSegmento] = useState<string>("all");
  const [page, setPage] = useState(1);

  const segmentos = useSegmentos();

  const { data, isLoading, isFetching, refetch } = useGradeConsulta({
    search: debouncedSearch || undefined,
    status,
    segmento,
    page,
    limit: 20,
  });

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setSegmento("all");
    setPage(1);
  };

  const getSaldoBadge = (saldo: number) => {
    if (saldo > 0)
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono font-semibold tabular-nums">
          {saldo.toLocaleString("pt-BR")}
        </Badge>
      );
    return (
      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 font-mono font-semibold tabular-nums">
        {saldo.toLocaleString("pt-BR")}
      </Badge>
    );
  };

  const getStatusBadge = (saldo: number) => {
    if (saldo > 0)
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
          Disponível
        </Badge>
      );
    return (
      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
        Ruptura
      </Badge>
    );
  };

  const hasActiveFilters = search !== "" || status !== "all" || segmento !== "all";

  return (
    <PublicLayout>
      <div className="max-w-[1400px] mx-auto w-full p-4 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Consulta de Estoque</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Grade de estoque disponível do CDD Maceió.
              {data?.snapshotDate && (
                <span className="ml-2 text-xs">
                  Atualizado em{" "}
                  <span className="font-medium text-foreground">
                    {format(new Date(data.snapshotDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </span>
              )}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="shrink-0 text-muted-foreground">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <Card className="p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-12 items-end">
            <div className="md:col-span-4 relative">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Produto ou Código</label>
              <Search className="absolute left-3 top-[30px] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou código..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Segmento</label>
              <Select value={segmento} onValueChange={(val) => { setSegmento(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os segmentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os segmentos</SelectItem>
                  {segmentos.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Situação</label>
              <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="ruptura">Ruptura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <Button
                variant="ghost"
                className={`w-full ${hasActiveFilters ? "text-primary" : "text-muted-foreground"}`}
                onClick={clearFilters}
              >
                <FilterX className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>

            <div className="md:col-span-1 flex items-end justify-end">
              {data && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  <span className="font-semibold text-foreground">{data.total.toLocaleString("pt-BR")}</span> SKUs
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border shadow-sm">
          <div className="overflow-x-auto relative">
            {isFetching && !isLoading && (
              <div className="absolute inset-0 bg-background/40 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[90px]">Situação</TableHead>
                  <TableHead className="w-[80px]">Cód.</TableHead>
                  <TableHead className="min-w-[240px]">Produto</TableHead>
                  <TableHead className="w-[60px]">Un.</TableHead>
                  <TableHead className="w-[140px]">Embalagem</TableHead>
                  <TableHead className="w-[140px]">Segmento</TableHead>
                  <TableHead className="text-right w-[100px]">Grade Cad.</TableHead>
                  <TableHead className="text-right w-[80px]">Reserva</TableHead>
                  <TableHead className="text-right w-[80px]">Saída</TableHead>
                  <TableHead className="text-right w-[110px]">Saldo Disp.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-40 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !data || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-40 text-center text-muted-foreground">
                      {data === null
                        ? "Nenhum dado de grade carregado. Faça o upload da base_grade no painel administrativo."
                        : "Nenhum produto encontrado com os filtros aplicados."}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>{getStatusBadge(item.saldoDisponivel)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.codigoProduto}</TableCell>
                      <TableCell className="font-medium text-xs leading-tight">{item.descricaoProduto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.unidadeMedida}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{stripCode(item.embalagem)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{stripCode(item.tipoMarca)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {item.gradeCadastrada.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {item.reserva > 0 ? (
                          <span className="text-amber-600 font-semibold">{item.reserva.toLocaleString("pt-BR")}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {item.saida.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">{getSaldoBadge(item.saldoDisponivel)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="border-t p-4 flex items-center justify-between bg-muted/20 gap-4 flex-wrap">
              <div className="text-xs text-muted-foreground">
                Página {page} de {data.totalPages} —{" "}
                {((page - 1) * 20 + 1).toLocaleString("pt-BR")} a{" "}
                {Math.min(page * 20, data.total).toLocaleString("pt-BR")} de{" "}
                {data.total.toLocaleString("pt-BR")} SKUs
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PublicLayout>
  );
}
