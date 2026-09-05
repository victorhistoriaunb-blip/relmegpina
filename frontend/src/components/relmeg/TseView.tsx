import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Loader2,
  Pin,
  Vote,
  Inbox,
  LayoutGrid,
  Table2,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsGrid } from "./CardsExecutivos";
import {
  ANOS_ELEITORAIS,
  UFS,
  badgeSituacao,
  cargoLabel,
  cargosPorAno,
  detalheCandidatoTSE,
  formatarBRL,
  listarCandidatosTSE,
} from "@/lib/relmeg/tse";
import type { TseCandidato, TseCandidatoDetalhe } from "@/lib/relmeg/tse";
import { salvarCandidatosNoMonitoramento, toggleFavorito, useRelmeg } from "@/lib/relmeg/store";
import { exportarCSV, exportarXLSX } from "@/lib/relmeg/export";

const OPCOES_POR_PAGINA = [20, 50] as const;
const OPCOES_VISAO = ["tabela", "cards"] as const;
type Visao = (typeof OPCOES_VISAO)[number];

export function TseView() {
  const { favoritos } = useRelmeg();
  const [ano, setAno] = useState<number>(2024);
  const [uf, setUf] = useState<string>("BR");
  const [codigoCargo, setCodigoCargo] = useState<number>(11);
  const [termo, setTermo] = useState("");
  const [candidatos, setCandidatos] = useState<TseCandidato[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(OPCOES_POR_PAGINA[0]);
  const [visao, setVisao] = useState<Visao>(OPCOES_VISAO[0]);
  const [erroInformado, setErroInformado] = useState<string | null>(null);
  const autoCarregado = useRef(false);

  const [sheetAberto, setSheetAberto] = useState(false);
  const [alvoDetalhe, setAlvoDetalhe] = useState<TseCandidato | null>(null);
  const [detalhe, setDetalhe] = useState<TseCandidatoDetalhe | null>(null);
  const [detalheCarregando, setDetalheCarregando] = useState(false);

  const cargosDisponiveis = useMemo(() => cargosPorAno(ano), [ano]);

  const candidatosSelecionados = useMemo(
    () => candidatos.filter((c) => selecionadas.has(c.id)),
    [candidatos, selecionadas],
  );

  const candidatosCards = useMemo(
    () =>
      candidatos.map((c) => ({
        ...c,
        titulo: c.nomeUrna || c.nomeCompleto || "Candidato",
        ementa: [
          `Candidato a ${cargoLabel(c.codigoCargo)}`,
          c.nomeCompleto && c.nomeCompleto !== c.nomeUrna ? c.nomeCompleto : "",
        ]
          .filter(Boolean)
          .join(" — "),
        autor: c.nomeUrna || c.nomeCompleto || "",
        partido: c.siglaPartido ?? "",
        uf: c.uf,
        status: c.descricaoSituacao ?? "",
        data: "",
      })),
    [candidatos],
  );

  useEffect(() => {
    if (autoCarregado.current || carregando || candidatos.length > 0) return;
    autoCarregado.current = true;
    void buscarCandidatos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatos.length, carregando]);

  const totalPaginas = Math.max(1, Math.ceil(candidatos.length / porPagina));
  const paginaAtualSegura = Math.min(Math.max(1, paginaAtual), totalPaginas);
  const inicio = (paginaAtualSegura - 1) * porPagina;
  const candidatosPagina = candidatos.slice(inicio, inicio + porPagina);

  const todosSelecionados =
    candidatos.length > 0 && candidatos.every((c) => selecionadas.has(c.id));
  const algumSelecionado = candidatos.some((c) => selecionadas.has(c.id));

  function mudarAno(valor: string) {
    const novoAno = Number(valor);
    setAno(novoAno);
    const cargos = cargosPorAno(novoAno);
    if (!cargos.includes(codigoCargo)) setCodigoCargo(cargos[0]!);
  }

  function alternarTodos() {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (todosSelecionados) {
        candidatos.forEach((c) => proximo.delete(c.id));
      } else {
        candidatos.forEach((c) => proximo.add(c.id));
      }
      return proximo;
    });
  }

  function alternarCandidato(id: number) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  async function buscarCandidatos(silencioso = false) {
    setCarregando(true);
    setSelecionadas(new Set());
    setPaginaAtual(1);
    setErroInformado(null);
    try {
      const lista = await listarCandidatosTSE(ano, uf, codigoCargo, termo);
      setCandidatos(lista);
      if (lista.length === 0 && !silencioso) {
        toast.info("Nenhum candidato encontrado para os filtros selecionados.");
      }
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : "Não foi possível consultar o TSE.";
      setCandidatos([]);
      setErroInformado(msg);
      if (!silencioso) toast.error(msg);
    } finally {
      setCarregando(false);
    }
  }

  async function abrirDossie(candidato: TseCandidato) {
    setAlvoDetalhe(candidato);
    setDetalhe(null);
    setSheetAberto(true);
    setDetalheCarregando(true);
    try {
      const resposta = await detalheCandidatoTSE(candidato.ano, candidato.uf, candidato.id);
      setDetalhe(resposta);
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : "Não foi possível carregar o dossiê.";
      toast.error(msg);
      setSheetAberto(false);
    } finally {
      setDetalheCarregando(false);
    }
  }

  async function adicionarAoMonitoramento() {
    const selecionados = candidatos.filter((c) => selecionadas.has(c.id));
    if (selecionados.length === 0) return;
    setSalvando(true);
    try {
      const adicionados = await salvarCandidatosNoMonitoramento(selecionados);
      setSelecionadas(new Set());
      toast.success(
        adicionados > 0
          ? `${adicionados} ${adicionados === 1 ? "candidato adicionado" : "candidatos adicionados"} ao Monitoramento`
          : "Os candidatos selecionados já estão no Monitoramento",
      );
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : "Não foi possível salvar no monitoramento.";
      setSelecionadas(new Set());
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Eleições
          </h1>
          <p className="text-sm text-muted-foreground">
            Candidaturas e patrimônio declarado via TSE (DivulgaCandContas).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ano</label>
            <Select value={String(ano)} onValueChange={mudarAno}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {ANOS_ELEITORAIS.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">UF</label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((sigla) => (
                  <SelectItem key={sigla} value={sigla}>
                    {sigla === "BR" ? "BR — Brasil" : sigla}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cargo</label>
            <Select value={String(codigoCargo)} onValueChange={(v) => setCodigoCargo(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                {cargosDisponiveis.map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {cargoLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void buscarCandidatos();
              }}
              placeholder="Filtrar por nome de urna, nome completo ou partido…"
              className="pl-9"
              aria-label="Filtrar por nome ou partido"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                  {opcao === "tabela" ? "Tabela" : "Cards"}
                </button>
              ))}
            </div>
            <Button onClick={() => void buscarCandidatos()} disabled={carregando} className="gap-2">
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {carregando ? "Pesquisando…" : "Pesquisar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                exportarCSV(candidatos as unknown as Record<string, unknown>[], "tse-candidatos");
                toast.success("CSV dos candidatos exportado.");
              }}
              disabled={candidatos.length === 0}
            >
              <FileDown className="h-4 w-4" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                exportarXLSX(candidatos as unknown as Record<string, unknown>[], "tse-candidatos");
                toast.success("Planilha dos candidatos exportada.");
              }}
              disabled={candidatos.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" /> XLSX
            </Button>
          </div>
        </div>
      </div>

      {erroInformado && candidatos.length === 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground/90">
          <span className="font-medium">Falha na consulta ao TSE:</span> {erroInformado}{" "}
          <button
            type="button"
            className="ml-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            onClick={() => void buscarCandidatos()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {carregando ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="w-14" />
                  <TableHead className="text-foreground">Nome de Urna</TableHead>
                  <TableHead className="text-foreground">Partido</TableHead>
                  <TableHead className="text-foreground">Número</TableHead>
                  <TableHead className="text-foreground">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, linha) => (
                  <TableRow key={`skeleton-${linha}`} aria-hidden="true">
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-32" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
            Carregando candidaturas junto ao TSE…
          </div>
        </div>
      ) : candidatos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-card/50 px-4 py-14 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Nenhuma candidatura encontrada</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            A base é carregada automaticamente ao abrir a aba. Ajuste ano, UF, cargo ou o termo de
            busca e clique em "Pesquisar".
          </p>
        </div>
      ) : visao === "cards" ? (
        <CardsGrid
          data={candidatosCards}
          favoritos={favoritos}
          acoes={{
            onToggleFavorito: (id) => toggleFavorito(id),
            onVerDetalhes: abrirDossie,
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="w-14">
                    <Checkbox
                      checked={todosSelecionados || (algumSelecionado ? "indeterminate" : false)}
                      onCheckedChange={alternarTodos}
                      disabled={candidatos.length === 0}
                      aria-label="Selecionar todos os candidatos"
                      title="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="text-foreground">Nome de Urna</TableHead>
                  <TableHead className="text-foreground">Partido</TableHead>
                  <TableHead className="text-foreground">Número</TableHead>
                  <TableHead className="text-foreground">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatosPagina.map((candidato) => (
                  <TableRow
                    key={candidato.id}
                    className={`cursor-pointer ${
                      selecionadas.has(candidato.id)
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-secondary/30"
                    }`}
                    onClick={() => abrirDossie(candidato)}
                    title="Abrir dossiê patrimonial"
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selecionadas.has(candidato.id)}
                        onCheckedChange={() => alternarCandidato(candidato.id)}
                        aria-label={`Selecionar ${candidato.nomeUrna}`}
                      />
                    </TableCell>
                    <TableCell className="whitespace-normal break-words font-medium text-foreground">{candidato.nomeUrna}</TableCell>
                    <TableCell className="text-foreground/90">
                      {candidato.siglaPartido ?? "—"}
                    </TableCell>
                    <TableCell className="text-foreground/90">{candidato.numero ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={badgeSituacao(candidato.descricaoSituacao)}>
                        {candidato.descricaoSituacao ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Itens por página:</span>
              <select
                value={porPagina}
                onChange={(e) => {
                  setPorPagina(Number(e.target.value));
                  setPaginaAtual(1);
                }}
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
                Página {paginaAtualSegura} de {totalPaginas} · {candidatos.length} candidato(s)
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

      {candidatosSelecionados.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-3">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-border/70 bg-card px-4 py-2 shadow-xl">
            <span className="whitespace-nowrap text-sm font-medium text-foreground">
              {candidatosSelecionados.length}{" "}
              {candidatosSelecionados.length === 1
                ? "candidato selecionado"
                : "candidatos selecionados"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setSelecionadas(new Set())}
            >
              Limpar Seleção
            </Button>
            <Button size="sm" className="gap-1.5" onClick={adicionarAoMonitoramento} disabled={salvando}>
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
              {salvando ? "Salvando…" : "Adicionar ao Monitoramento"}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        >
          {alvoDetalhe && detalheCarregando && <DossieSkeleton />}
          {alvoDetalhe && detalhe && !detalheCarregando && (
            <Dossie candidato={alvoDetalhe} detalhe={detalhe} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LinhaDado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </span>
      <span className="text-sm text-foreground/90">{valor}</span>
    </div>
  );
}

function Dossie({ candidato, detalhe }: { candidato: TseCandidato; detalhe: TseCandidatoDetalhe }) {
  const foto =
    detalhe.dados.fotoUrl ||
    candidato.fotoUrl ||
    detalhe.dados.nomeCompleto?.charAt(0) ||
    candidato.nomeUrna?.charAt(0);

  const coligacao =
    detalhe.eleicao.coligacao || detalhe.eleicao.federacao || "Não informada";

  return (
    <>
      <SheetHeader className="sticky top-0 z-10 border-b border-border/70 bg-background/90 p-6 backdrop-blur-xl">
        <SheetTitle className="sr-only">Dossiê patrimonial</SheetTitle>
        <SheetDescription className="sr-only">
          Detalhamento patrimonial e dados do candidato.
        </SheetDescription>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary text-2xl font-bold text-foreground">
            {foto && String(foto).startsWith("http") ? (
              <img
                src={String(foto)}
                alt={detalhe.dados.nomeUrna ?? "Candidato"}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{String(foto ?? "?")}</span>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-lg font-bold leading-tight text-foreground">
              {detalhe.dados.nomeCompleto || candidato.nomeCompleto}
            </h2>
            <p className="text-sm text-muted-foreground">
              {detalhe.dados.nomeUrna || candidato.nomeUrna} · {detalhe.eleicao.partido || "—"} ·{" "}
              {Number.isInteger(detalhe.eleicao.numero) ? `${detalhe.eleicao.numero}` : "—"}
            </p>
            <Badge className={badgeSituacao(detalhe.dados.situacao ?? candidato.descricaoSituacao)}>
              {detalhe.dados.situacao ?? candidato.descricaoSituacao ?? "—"}
            </Badge>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-7 p-6">
        <section className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">Dados Pessoais</h3>
          <div className="grid gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4 sm:grid-cols-2">
            <LinhaDado rotulo="Ocupação" valor={detalhe.dados.ocupacao || "Não informada"} />
            <LinhaDado
              rotulo="Grau de Instrução"
              valor={detalhe.dados.grauInstrucao || "Não informado"}
            />
            <div className="sm:col-span-2">
              <LinhaDado rotulo="Coligação / Federação" valor={coligacao} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Resumo Financeiro
          </h3>
          <div className="flex flex-col gap-1 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Patrimônio Total Declarado
            </span>
            <span className="font-display text-2xl font-bold text-foreground">
              {formatarBRL(detalhe.patrimonio.totalDeBens)}
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Declaração de Bens
          </h3>
          {detalhe.patrimonio.bens.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 p-8 text-center">
              <Vote className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Nenhum bem declarado</p>
              <p className="text-xs text-muted-foreground">
                O candidato não declarou bens nesta eleição.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 rounded-xl border border-border/70">
              {detalhe.patrimonio.bens.map((bem, i) => (
                <li key={i} className="flex flex-col gap-1.5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Badge variant="secondary">{bem.tipo || "Outros"}</Badge>
                    <p className="mt-1 text-sm text-foreground/90">
                      {bem.descricao || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-foreground">
                    {formatarBRL(bem.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function DossieSkeleton() {
  return (
    <div className="flex min-h-screen flex-col gap-6 p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="w-full space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="w-full space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="w-full space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}