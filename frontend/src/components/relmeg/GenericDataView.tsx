import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  X,
  Pin,
  Send,
  Loader2,
  Table2,
  LayoutGrid,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useRelmeg, setFilter, toggleFavorito, editarParlamentar } from "@/lib/relmeg/store";
import { useDebouncedValue } from "@/lib/relmeg/useDebounce";
import { CardsGrid, type CardExecutivoAcoes } from "./CardsExecutivos";
import { exportarCSV, exportarXLSX } from "@/lib/relmeg/export";
import { tituloProposicao } from "@/lib/relmeg/clipping";

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
  onRowClick?: (item: any) => void;
  selecionavel?: boolean;
  onAdicionarAoMonitoramento?: (itens: any[]) => void;
  onExportarClipping?: (itens: any[]) => void;
  autoCarregarVazio?: boolean;
}

const OPCOES_POR_PAGINA = [20, 50] as const;
const OPCOES_VISAO = ["tabela", "cards"] as const;
type Visao = (typeof OPCOES_VISAO)[number];

export function GenericDataView({
  titulo,
  subtitulo,
  data,
  columns,
  loading,
  onRefresh,
  onRowClick,
  selecionavel,
  onAdicionarAoMonitoramento,
  onExportarClipping,
  autoCarregarVazio = false,
}: GenericDataViewProps) {
  const { filters, favoritos } = useRelmeg();
  const busca = filters?.busca ?? "";
  const buscaFiltrada = useDebouncedValue(busca, 500);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroColuna, setFiltroColuna] = useState("todos");
  const [termoColuna, setTermoColuna] = useState("");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(OPCOES_POR_PAGINA[0]);
  const [visao, setVisao] = useState<Visao>(OPCOES_VISAO[0]);
  const autoLoadFeito = useRef(false);

  useEffect(() => {
    if (autoCarregarVazio && data.length === 0 && !loading && onRefresh && !autoLoadFeito.current) {
      autoLoadFeito.current = true;
      void onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCarregarVazio, data.length, loading]);

  useEffect(() => {
    autoLoadFeito.current = false;
  }, [titulo]);

  const acoesCards = useMemo<CardExecutivoAcoes>(
    () => ({
      onToggleFavorito: (id) => toggleFavorito(id),
      onVerDetalhes: onRowClick,
      onAnexarNota: (item, nota) => {
        if (!item?.id) return;
        editarParlamentar(String(item.id), { anotacoes: nota });
        toast.success(`Nota anexada a "${tituloProposicao(item)}"`);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onRowClick],
  );

  const dadosFiltrados = useMemo(() => {
    return data.filter((item) => {
      const termos = buscaFiltrada
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const valores = Object.values(item).map((val) => String(val ?? "").toLowerCase());
      const matchGlobal =
        termos.length === 0 || termos.some((termo) => valores.some((valor) => valor.includes(termo)));

      let matchColuna = true;
      if (mostrarFiltros && termoColuna && filtroColuna !== "todos") {
        const valorItem = String(item[filtroColuna] ?? "").toLowerCase();
        matchColuna = valorItem.includes(termoColuna.toLowerCase());
      }

      return matchGlobal && matchColuna;
    });
  }, [data, buscaFiltrada, mostrarFiltros, filtroColuna, termoColuna]);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / porPagina));
  const paginaAtualSegura = Math.min(Math.max(1, paginaAtual), totalPaginas);
  const inicio = (paginaAtualSegura - 1) * porPagina;
  const dadosPagina = dadosFiltrados.slice(inicio, inicio + porPagina);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroColuna, termoColuna, data, porPagina]);

  const idDe = (item: any) => String(item?.id ?? "");

  const todosSelecionados =
    dadosFiltrados.length > 0 && dadosFiltrados.every((item) => selecionadas.has(idDe(item)));
  const algumSelecionado = dadosFiltrados.some((item) => selecionadas.has(idDe(item)));

  const alternarTodos = () => {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      const ids = dadosFiltrados.map(idDe);
      if (todosSelecionados) ids.forEach((id) => proximo.delete(id));
      else ids.forEach((id) => proximo.add(id));
      return proximo;
    });
  };

  const alternarItem = (id: string) => {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const limparSelecao = () => setSelecionadas(new Set());

  const adicionarAoMonitoramento = () => {
    const selecionados = dadosFiltrados.filter((item) => selecionadas.has(idDe(item)));
    onAdicionarAoMonitoramento?.(selecionados);
    limparSelecao();
  };

  const exportarClipping = () => {
    const selecionados = dadosFiltrados.filter((item) => selecionadas.has(idDe(item)));
    onExportarClipping?.(selecionados);
    limparSelecao();
  };

  const limparFiltros = () => {
    setFilter("busca", "");
    setTermoColuna("");
    setFiltroColuna("todos");
  };

  const colSpan = columns.length + (selecionavel ? 1 : 0);

  return (
    <div className={`space-y-6 ${selecionavel ? "pb-24" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {titulo}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Atualizando…" : "Atualizar base"}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar nos registros desta página..."
            value={busca}
            onChange={(e) => setFilter("busca", e.target.value)}
            className="pl-9"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setFilter("busca", "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
          <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Filtrar por campo:
          </div>

          <select
            value={filtroColuna}
            onChange={(e) => setFiltroColuna(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="todos">Todos os campos</option>
            {columns.map((col) => (
              <option key={col.key} value={col.key}>
                {col.label}
              </option>
            ))}
          </select>

          <Input
            placeholder="Valor exato ou parcial..."
            value={termoColuna}
            onChange={(e) => setTermoColuna(e.target.value)}
            className="flex-1 bg-background"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={limparFiltros}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" /> Limpar
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/30 p-1">
          {OPCOES_VISAO.map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setVisao(opcao)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                visao === opcao
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opcao === "tabela" ? (
                <Table2 className="h-3.5 w-3.5" />
              ) : (
                <LayoutGrid className="h-3.5 w-3.5" />
              )}
              {opcao === "tabela" ? "Tabela" : "Cards Executivos"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              exportarCSV(dadosFiltrados, titulo);
              toast.success("CSV exportado com sucesso.");
            }}
            disabled={dadosFiltrados.length === 0}
          >
            <FileDown className="h-4 w-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              exportarXLSX(dadosFiltrados, titulo);
              toast.success("Planilha XLSX exportada com sucesso.");
            }}
            disabled={dadosFiltrados.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" /> XLSX
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Mostrando {dadosFiltrados.length} de {data.length} registros no recorte
        </span>
        {selecionavel && selecionadas.size > 0 && (
          <span className="font-medium text-primary">{selecionadas.size} selecionada(s)</span>
        )}
      </div>

      {visao === "tabela" ? (
        <div className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {selecionavel && (
                    <th className="w-14 px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={todosSelecionados || (algumSelecionado ? "indeterminate" : false)}
                          onCheckedChange={alternarTodos}
                          disabled={dadosFiltrados.length === 0}
                          aria-label="Selecionar todas"
                          title="Selecionar todas"
                        />
                      </div>
                    </th>
                  )}
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, linha) => (
                    <tr key={`skeleton-${linha}`} aria-hidden="true">
                      <td colSpan={colSpan} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : dadosPagina.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado para esta consulta.
                    </td>
                  </tr>
                ) : (
                  dadosPagina.map((item, idx) => {
                    const id = idDe(item);
                    return (
                      <tr
                        key={id || `row-${idx}`}
                        onClick={() => onRowClick?.(item)}
                        className={`transition-colors ${
                          onRowClick ? "cursor-pointer" : ""
                        } ${
                          selecionavel && selecionadas.has(id)
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-secondary/30"
                        }`}
                      >
                        {selecionavel && (
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selecionadas.has(id)}
                              onCheckedChange={() => alternarItem(id)}
                              aria-label={`Selecionar ${columns[0]?.key ? String(item[columns[0].key] ?? "") : ""}`}
                            />
                          </td>
                        )}
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className="whitespace-normal break-words px-4 py-3 align-top text-foreground/90"
                          >
                            {col.render ? col.render(item) : String(item[col.key] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <CardsGrid
          data={dadosPagina}
          loading={loading}
          favoritos={favoritos}
          indiceInicial={inicio}
          acoes={acoesCards}
        />
      )}

      {!loading && dadosFiltrados.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Itens por página:</span>
              <select
                value={porPagina}
                onChange={(e) => setPorPagina(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Itens por página"
              >
                {OPCOES_POR_PAGINA.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Página {paginaAtualSegura} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtualSegura <= 1}
                className="h-8"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtualSegura >= totalPaginas}
                className="h-8"
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}

      {selecionavel &&
        (onAdicionarAoMonitoramento || onExportarClipping) &&
        selecionadas.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 px-3">
            <div className="mx-auto flex w-fit min-w-0 flex-wrap items-center justify-center gap-3 rounded-full border border-border/70 bg-card py-2 pl-4 pr-2 shadow-xl">
              <span className="whitespace-nowrap text-sm font-medium text-foreground">
                {selecionadas.size}{" "}
                {selecionadas.size === 1 ? "registro selecionado" : "registros selecionados"}
              </span>
              {onAdicionarAoMonitoramento && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 rounded-full"
                  onClick={adicionarAoMonitoramento}
                  disabled={loading}
                >
                  <Pin className="h-4 w-4" />
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
                    </>
                  ) : (
                    "Adicionar ao Monitoramento"
                  )}
                </Button>
              )}
              {onExportarClipping && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 rounded-full border border-border/70"
                  onClick={exportarClipping}
                  disabled={loading}
                >
                  <Send className="h-4 w-4" /> Exportar Clipping (WhatsApp)
                </Button>
              )}
              <button
                type="button"
                onClick={limparSelecao}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Limpar seleção"
                title="Limpar seleção"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
}