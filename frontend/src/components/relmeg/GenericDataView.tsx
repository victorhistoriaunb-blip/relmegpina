import { useState, useMemo } from "react";
import { Search, Filter, RefreshCw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
}

interface GenericDataViewProps {
  titulo: string;
  subtitulo: string;
  data: any[];
  columns: Column[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function GenericDataView({
  titulo,
  subtitulo,
  data,
  columns,
  loading,
  onRefresh,
}: GenericDataViewProps) {
  const [busca, setBusca] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroColuna, setFiltroColuna] = useState("todos");
  const [termoColuna, setTermoColuna] = useState("");

  const dadosFiltrados = useMemo(() => {
    return data.filter((item) => {
      const matchGlobal = !busca || Object.values(item).some((val) =>
        String(val ?? "").toLowerCase().includes(busca.toLowerCase())
      );

      let matchColuna = true;
      if (mostrarFiltros && termoColuna && filtroColuna !== "todos") {
        const valorItem = String(item[filtroColuna] ?? "").toLowerCase();
        matchColuna = valorItem.includes(termoColuna.toLowerCase());
      }

      return matchGlobal && matchColuna;
    });
  }, [data, busca, mostrarFiltros, filtroColuna, termoColuna]);

  const limparFiltros = () => {
    setBusca("");
    setTermoColuna("");
    setFiltroColuna("todos");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {titulo}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar base
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar nos registros..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button 
          variant={mostrarFiltros ? "default" : "secondary"} 
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" /> 
          {mostrarFiltros ? "Ocultar Filtros" : "Filtros Avançados"}
        </Button>
      </div>

      {mostrarFiltros && (
        <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 animate-in fade-in-50 duration-200">
          <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">Filtrar por campo:</div>
          
          <select 
            value={filtroColuna}
            onChange={(e) => setFiltroColuna(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="todos">Todos os campos</option>
            {columns.map((col) => (
              <option key={col.key} value={col.key}>{col.label}</option>
            ))}
          </select>

          <Input
            placeholder="Valor exato ou parcial..."
            value={termoColuna}
            onChange={(e) => setTermoColuna(e.target.value)}
            className="flex-1 bg-background"
          />

          <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" /> Limpar
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Mostrando {dadosFiltrados.length} de {data.length} registros no recorte</span>
      </div>

      <div className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/70 bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum registro encontrado para esta consulta.
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((item, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-secondary/30">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-foreground/90">
                        {col.render ? col.render(item) : String(item[col.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}