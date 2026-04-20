import { useState } from "react";
import { PublicLayout } from "@/components/layout/public-layout";
import { useGetEstoque, useGetEstoqueMarcas } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/use-debounce";

export default function Estoque() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  
  const [marca, setMarca] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [curva, setCurva] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: marcasData } = useGetEstoqueMarcas();
  
  const { data, isLoading, isFetching } = useGetEstoque({
    search: debouncedSearch || undefined,
    marca: marca !== "all" ? marca : undefined,
    status: status !== "all" ? status as any : undefined,
    curva: curva !== "all" ? curva as any : undefined,
    page,
    limit: 20
  });

  const clearFilters = () => {
    setSearch("");
    setMarca("all");
    setStatus("all");
    setCurva("all");
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    if (status === "OK") return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>;
    if (status === "NOK") return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">NOK</Badge>;
    return <Badge>{status}</Badge>;
  };

  const getCurvaBadge = (curva: string) => {
    if (curva === "A") return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Curva A</Badge>;
    if (curva === "B") return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Curva B</Badge>;
    if (curva === "C") return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Curva C</Badge>;
    return <Badge variant="outline">{curva}</Badge>;
  };

  return (
    <PublicLayout>
      <div className="max-w-[1400px] mx-auto w-full p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Consulta de Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">Busque produtos, verifique rupturas e analise o DOI em tempo real.</p>
        </div>

        <Card className="p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-12 items-end">
            <div className="md:col-span-4 relative">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Produto ou Código</label>
              <Search className="absolute left-3 top-[30px] h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar SKUs..." 
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Marca</label>
              <Select value={marca} onValueChange={(val) => { setMarca(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Marcas</SelectItem>
                  {marcasData?.marcas.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="NOK">NOK (Ruptura)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Curva</label>
              <Select value={curva} onValueChange={(val) => { setCurva(val); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="A">Curva A</SelectItem>
                  <SelectItem value="B">Curva B</SelectItem>
                  <SelectItem value="C">Curva C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button variant="ghost" className="text-muted-foreground" onClick={clearFilters}>
                <FilterX className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border shadow-sm">
          <div className="overflow-x-auto relative">
            {isFetching && (
              <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="min-w-[250px]">Produto</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Emb.</TableHead>
                  <TableHead className="text-right">DOI</TableHead>
                  <TableHead className="text-right">Demanda</TableHead>
                  <TableHead className="text-right text-muted-foreground">Min / Max</TableHead>
                  <TableHead className="text-center w-[100px]">Curva</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      Nenhum produto encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="font-medium text-xs leading-tight uppercase">{item.produto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.marca}</TableCell>
                      <TableCell className="text-xs">{item.embalagem}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{item.doi}</TableCell>
                      <TableCell className="text-right text-xs">{item.demanda}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {item.min} / {item.max}
                      </TableCell>
                      <TableCell className="text-center">{getCurvaBadge(item.curva)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {data && data.totalPages > 1 && (
            <div className="border-t p-4 flex items-center justify-between bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Mostrando {(page - 1) * 20 + 1} a {Math.min(page * 20, data.total)} de {data.total} SKUs
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <PaginationPrevious className="h-4 w-4 mr-1 p-0" />
                      Anterior
                    </Button>
                  </PaginationItem>
                  <PaginationItem className="hidden sm:block px-4 text-sm font-medium">
                    {page} de {data.totalPages}
                  </PaginationItem>
                  <PaginationItem>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page === data.totalPages}
                    >
                      Próxima
                      <PaginationNext className="h-4 w-4 ml-1 p-0" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>
    </PublicLayout>
  );
}
