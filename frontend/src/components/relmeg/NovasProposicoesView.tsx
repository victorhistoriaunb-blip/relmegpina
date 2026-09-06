import { useMemo, useState, useEffect, useRef } from "react";
import {
  Sparkles,
  SquareCheck,
  Send,
  Inbox,
  RefreshCw,
  FileDown,
  FileSpreadsheet,
  Copy,
  Clipboard,
  Pin,
  Plus,
  PenLine,
  ExternalLink,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useRelmeg,
  setClienteAtivo,
  adicionarCliente,
  atualizarCliente,
  rotuloCliente,
} from "@/lib/relmeg/store";
import {
  exportarClippingParaWhatsApp,
  formatarData,
  autorComPartido,
  linkProposicao,
  tituloProposicao,
  montarClipping,
} from "@/lib/relmeg/clipping";
import { getCamaraResumo, getSenadoResumo } from "@/lib/relmeg/apiService";
import { exportarCSV, exportarXLSX } from "@/lib/relmeg/export";
import { termosDeMonitoramento, clienteDeEmenta, slugDe } from "@/lib/relmeg/clientes";
import type { ClienteDef } from "@/lib/relmeg/types";
import { toast } from "sonner";

type Casa = "camara" | "senado";

interface NovaProposicao {
  id: string;
  casa: Casa;
  titulo: string;
  ementa: string;
  autor: string;
  partido: string;
  uf: string;
  data: string;
  link?: string;
  cliente?: string;
  status?: string;
  comissao?: string;
  relator?: string;
}

const TITULO_CASA: Record<Casa, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
};

// Cores estritas por casa: verde = Câmara, azul = Senado.
const CORES_CASA: Record<Casa, { badge: string; titulo: string }> = {
  camara: {
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    titulo: "text-emerald-400",
  },
  senado: {
    badge: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    titulo: "text-sky-400",
  },
};

function separarPalavras(texto: string): string[] {
  return [
    ...new Set(
      texto
        .split(/[,;\n]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function converterDaBase(item: any, idx: number, clientes: ClienteDef[]): NovaProposicao {
  const casa: Casa = item.categoria === "senado" ? "senado" : "camara";
  const sigla = String(item.sigla || item.siglaTipo || "").trim();
  const numero = String(item.numero ?? "").trim();
  const ano = String(item.ano ?? "").trim();
  const semAno = [sigla, numero].filter(Boolean).join(" ");
  const titulo =
    String(item.titulo || "").trim() || (ano && semAno ? `${semAno}/${ano}` : semAno);
  const texto = String(item.ementa || item.titulo || "");
  const link = linkProposicao(item);
  const cliente = clienteDeEmenta(texto, clientes);

  return {
    id: String(item.id || `np-store-${idx}`),
    casa,
    titulo,
    ementa: String(item.ementa || item.ementa1 || item.descricao || "").trim(),
    autor: String(item.autor || item.nome || "").trim(),
    partido: String(item.partido || "").trim(),
    uf: String(item.uf || "").trim(),
    data: String(item.data || item.atualizacao || "").trim(),
    ...(link ? { link } : {}),
    ...(cliente ? { cliente } : {}),
    ...(item.situacao || item.status
      ? { status: String(item.situacao || item.status || "").trim() }
      : {}),
    ...(item.comissao ? { comissao: String(item.comissao).trim() } : {}),
    ...(item.relator ? { relator: String(item.relator).trim() } : {}),
  };
}

export function NovasProposicoesView() {
  const { data, clienteAtivo, clientes } = useRelmeg();
  const cliente = clienteAtivo || "todos";
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [termoExtra, setTermoExtra] = useState("");

  const [drawerAberto, setDrawerAberto] = useState(false);
  const [alvo, setAlvo] = useState<NovaProposicao | null>(null);

  const [editorAberto, setEditorAberto] = useState(false);
  const [editando, setEditando] = useState<ClienteDef | null>(null);
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [palavras, setPalavras] = useState("");
  const [temas, setTemas] = useState("");

  const proposicoes = useMemo(() => {
    return data
      .filter((item) => item.categoria === "camara" || item.categoria === "senado")
      .map((item, idx) => converterDaBase(item, idx, clientes));
  }, [data, clientes]);

  const filtradas = useMemo(
    () => (cliente === "todos" ? proposicoes : proposicoes.filter((p) => p.cliente === cliente)),
    [proposicoes, cliente],
  );

  const autoLoadFeito = useRef(false);

  useEffect(() => {
    if (
      autoLoadFeito.current ||
      carregando ||
      data.some((item) => item.categoria === "camara" || item.categoria === "senado")
    ) {
      return;
    }
    autoLoadFeito.current = true;
    void atualizarBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, carregando]);

  const selecionadasLista = useMemo(
    () => proposicoes.filter((p) => selecionadas.has(p.id)),
    [proposicoes, selecionadas],
  );

  async function atualizarBase() {
    setCarregando(true);
    try {
      const keywords = termosDeMonitoramento(clienteAtivo, clientes, termoExtra) || undefined;
      const [camara, senado] = await Promise.all([
        getCamaraResumo(keywords),
        getSenadoResumo(keywords),
      ]);
      const camaraItens = ((camara as any)?.proposicoes ?? []).map((p: any) => ({
        id: String(p.id),
        categoria: "camara",
        cliente: clienteDeEmenta(String(p.ementa ?? ""), clientes) ?? undefined,
        siglaTipo: p.siglaTipo,
        numero: String(p.numero ?? ""),
        ano: String(p.ano ?? ""),
        ementa: String(p.ementa ?? ""),
        situacao: p.situacao,
        comissao: p.comissao,
        relator: p.relator,
      }));
      const senadoItens = ((senado as any)?.materias ?? []).map((m: any) => ({
        id: String(m.codigo ?? m.identificacaoProcesso ?? ""),
        categoria: "senado",
        cliente: clienteDeEmenta(String(m.ementa ?? ""), clientes) ?? undefined,
        sigla: m.sigla,
        numero: String(m.numero ?? ""),
        ano: String(m.ano ?? ""),
        ementa: String(m.ementa ?? ""),
        autor: String(m.autor ?? ""),
        data: String(m.data ?? ""),
        urls: m.url,
        situacao: m.situacao,
        comissao: m.comissao,
        relator: m.relator,
      }));
      const total = camaraItens.length + senadoItens.length;
      if (total === 0) {
        toast.info("Nenhuma proposição nova retornada pelas APIs.");
        return;
      }
      useRelmeg.getState().substituirCategoria("camara", camaraItens);
      useRelmeg.getState().substituirCategoria("senado", senadoItens);
      toast.success(`${total} proposições atualizadas das casas legislativas.`);
    } catch {
      toast.error("Não foi possível atualizar a base de proposições.");
    } finally {
      setCarregando(false);
    }
  }

  function alternarItem(id: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function selecionarFiltradas() {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      filtradas.forEach((p) => proximo.add(p.id));
      return proximo;
    });
  }

  function limparSelecao() {
    setSelecionadas(new Set());
  }

  function exportar() {
    void exportarClippingParaWhatsApp(selecionadasLista);
    limparSelecao();
  }

  function abrirDetalhe(p: NovaProposicao) {
    setAlvo(p);
    setDrawerAberto(true);
  }

  function abrirNovoCliente() {
    setEditando(null);
    setNome("");
    setSetor("");
    setPalavras("");
    setTemas("");
    setEditorAberto(true);
  }

  function abrirEdicaoCliente() {
    const atual = clientes.find((c) => c.key === clienteAtivo);
    if (!atual) {
      abrirNovoCliente();
      return;
    }
    setEditando(atual);
    setNome(atual.label);
    setSetor(atual.setor ?? "");
    setPalavras((atual.palavrasChave ?? []).join(", "));
    setTemas((atual.temas ?? []).join(", "));
    setEditorAberto(true);
  }

  function salvarCliente() {
    const label = nome.trim();
    if (!label) {
      toast.error("Informe o nome do cliente/projeto.");
      return;
    }
    const chave = editando?.key || slugDe(label);
    if (!chave) {
      toast.error("Não foi possível gerar a chave do cliente.");
      return;
    }
    const payload: ClienteDef = {
      key: chave,
      label,
      ...(setor.trim() ? { setor: setor.trim() } : {}),
      palavrasChave: separarPalavras(palavras),
      ...(separarPalavras(temas).length ? { temas: separarPalavras(temas) } : {}),
    };
    if (editando) atualizarCliente(payload);
    else adicionarCliente(payload);
    setClienteAtivo(chave);
    setEditorAberto(false);
    toast.success(
      editando
        ? `Interesses de "${label}" atualizados.`
        : `Cliente "${label}" criado e ativado para as varreduras.`,
    );
  }

  function copiarTexto(texto: string, rotulo: string) {
    if (!texto) {
      toast.info(`Nada para copiar (${rotulo} vazio).`);
      return;
    }
    void navigator.clipboard
      .writeText(texto)
      .then(() => toast.success(`${rotulo} copiado para a área de transferência.`))
      .catch(() =>
        toast.error("Não foi possível copiar. Seu navegador bloqueou a área de transferência."),
      );
  }

  function adicionarUnica(p: NovaProposicao) {
    const chaveUnica = `np-${p.casa}-${p.id}`;
    const existe = useRelmeg
      .getState()
      .data.some((i) => i.id === chaveUnica && i.categoria === "monitoramento");
    if (existe) {
      toast.info("Esta proposição já está no Monitoramento.");
      return;
    }
    useRelmeg.getState().addItem({
      id: chaveUnica,
      categoria: "monitoramento",
      origemCategoria: p.casa,
      nome: p.autor || p.titulo,
      titulo: p.titulo,
      ementa: p.ementa,
      ...(p.autor ? { autor: p.autor } : {}),
      ...(p.partido ? { partido: p.partido } : {}),
      ...(p.uf ? { uf: p.uf } : {}),
      ...(p.data ? { data: p.data } : {}),
      ...(p.link ? { link: p.link } : {}),
      ...(p.cliente ? { cliente: p.cliente } : {}),
      ...(p.status ? { status: p.status } : {}),
      ...(p.comissao ? { comissao: p.comissao } : {}),
      status: "Em monitoramento",
      atualizacao: new Date().toLocaleDateString("pt-BR"),
    });
    toast.success("Proposição adicionada ao Monitoramento.");
  }

  return (
    <div className={`space-y-6 ${selecionadas.size > 0 ? "pb-24" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Novas Proposições
          </h1>
          <p className="text-sm text-muted-foreground">
            Projetos recém-apresentados na Câmara (verde) e no Senado (azul), recortados por
            cliente e interesse.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Cliente / Tema da varredura
            </label>
            <Select value={cliente} onValueChange={setClienteAtivo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cliente / Tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Clientes/Temas</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Termo extra da varredura (opcional)
            </label>
            <Input
              value={termoExtra}
              onChange={(e) => setTermoExtra(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void atualizarBase();
              }}
              placeholder="Ex.: hidrogênio, PPP, licenciamento…"
            />
          </div>
          <Button
            onClick={() => void atualizarBase()}
            disabled={carregando}
            className="gap-2"
          >
            {carregando ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {carregando ? "Buscando…" : "Atualizar base"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={abrirNovoCliente}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={abrirEdicaoCliente}
            disabled={cliente === "todos"}
            title={
              cliente === "todos"
                ? "Selecione um cliente para editar os interesses de busca"
                : "Editar palavras-chave e temas do cliente ativo"
            }
          >
            <PenLine className="h-4 w-4" /> Interesses do cliente
          </Button>
          <div className="mx-1 h-5 w-px bg-border/60" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportarCSV(filtradas as unknown as Record<string, unknown>[], "novas-proposicoes");
              toast.success("CSV exportado com sucesso.");
            }}
            disabled={filtradas.length === 0}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportarXLSX(
                filtradas as unknown as Record<string, unknown>[],
                "novas-proposicoes",
              );
              toast.success("Planilha XLSX exportada com sucesso.");
            }}
            disabled={filtradas.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">XLSX</span>
          </Button>
          <Button variant="outline" size="sm" onClick={selecionarFiltradas} className="gap-2">
            <SquareCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Selecionar resultados</span>
          </Button>
          <p className="ml-auto text-xs text-muted-foreground">
            A varredura cruza as palavras-chave do cliente ativo com as APIs{" "}
            <code className="rounded bg-secondary/60 px-1">/api/camara</code> e{" "}
            <code className="rounded bg-secondary/60 px-1">/api/senado</code>. Clique em um cartão
            para abrir o drawer com cópia.
          </p>
        </div>
      </div>

      <Dialog open={editorAberto} onOpenChange={setEditorAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando ? "Interesses de busca do cliente" : "Novo cliente / projeto"}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "Defina as palavras-chave e temas que guiam a varredura de proposições e publicações."
                : "Cadastre o cliente com nome, setor e palavras-chave. A chave é gerada do nome; o cliente é ativado ao salvar."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cliente-nome">Nome</Label>
              <Input id="cliente-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: NovaCliente Energia" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cliente-setor">Setor</Label>
              <Input id="cliente-setor" value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex.: Mineração, Saúde, Agronegócio…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cliente-palavras">Palavras-chave de monitoramento</Label>
              <Textarea id="cliente-palavras" rows={3} value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="Separe por vírgula ou linha. Ex.: ferro, mineradora, licenciamento, PPP…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cliente-temas">Temas (rótulos de recorte)</Label>
              <Textarea id="cliente-temas" rows={2} value={temas} onChange={(e) => setTemas(e.target.value)} placeholder="Opcional. Ex.: Transição energética, Marco regulatório…" />
            </div>
            {!editando && nome.trim() && (
              <p className="text-xs text-muted-foreground">
                Chave gerada:{" "}
                <code className="rounded bg-secondary/60 px-1">{slugDe(nome) || "—"}</code>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarCliente}>
              {editando ? "Salvar interesses" : "Criar e ativar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="w-full space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="mt-3 flex gap-1.5">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-card/50 px-4 py-14 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Nenhuma proposição para este recorte</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {clienteAtivo === "todos"
              ? "Clique em 'Atualizar base' para puxar proposições reais das APIs da Câmara e do Senado."
              : "Ajuste as palavras-chave do cliente ou volte para 'Todos os Clientes/Temas'."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((p, i) => (
            <article
              key={p.id}
              onClick={() => abrirDetalhe(p)}
              className={`relative cursor-pointer rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors ${
                selecionadas.has(p.id)
                  ? "bg-primary/5 ring-1 ring-primary/40"
                  : "hover:bg-secondary/20"
              } animate-in fade-in-50 duration-200`}
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              title="Abrir detalhes e opções de cópia"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={CORES_CASA[p.casa].badge}>{TITULO_CASA[p.casa]}</Badge>
                    {p.cliente && (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {rotuloCliente(p.cliente)}
                      </Badge>
                    )}
                  </div>
                  {p.link ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-1 break-words font-bold hover:underline ${CORES_CASA[p.casa].titulo}`}
                      title={`Abrir ${p.titulo} na fonte oficial`}
                    >
                      {p.titulo}
                    </a>
                  ) : (
                    <h3 className={`mt-1 break-words font-bold ${CORES_CASA[p.casa].titulo}`}>
                      {p.titulo}
                    </h3>
                  )}
                </div>
                <Checkbox
                  checked={selecionadas.has(p.id)}
                  onCheckedChange={() => alternarItem(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Selecionar ${p.titulo}`}
                />
              </div>

              <p className="mt-3 text-sm leading-relaxed text-foreground/90 line-clamp-4">
                {p.ementa || "Sem ementa disponível."}
              </p>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground/80">Autor:</span>{" "}
                  {autorComPartido(p)}
                </p>
                <p>
                  <span className="font-medium text-foreground/80">Data:</span>{" "}
                  {formatarData(p.data)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {p.status && (
                  <Badge variant="outline" className="whitespace-nowrap font-normal text-muted-foreground">
                    {p.status}
                  </Badge>
                )}
                {p.comissao && (
                  <Badge variant="outline" className="whitespace-nowrap font-normal text-muted-foreground">
                    {p.comissao}
                  </Badge>
                )}
                {p.relator && (
                  <Badge variant="outline" className="whitespace-nowrap font-normal text-muted-foreground">
                    Relator: {p.relator}
                  </Badge>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {selecionadas.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 px-3">
          <div className="mx-auto flex w-fit min-w-0 flex-wrap items-center justify-center gap-3 rounded-full border border-border/70 bg-card py-2 pl-4 pr-2 shadow-xl">
            <span className="whitespace-nowrap text-sm font-medium text-foreground">
              {selecionadas.size}{" "}
              {selecionadas.size === 1 ? "proposição selecionada" : "proposições selecionadas"}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2 rounded-full border border-border/70"
              onClick={exportar}
            >
              <Send className="h-4 w-4" /> Exportar Clipping (WhatsApp)
            </Button>
            <button
              type="button"
              onClick={limparSelecao}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Limpar seleção"
              title="Limpar seleção"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        >
          {alvo && (
            <>
              <SheetHeader className="sticky top-0 z-10 border-b border-border/70 bg-background/90 p-6 backdrop-blur-xl">
                <SheetTitle className="sr-only">Detalhes da proposição</SheetTitle>
                <SheetDescription className="sr-only">
                  Proposição legislativa selecionada na listagem, com opções de cópia e vínculo.
                </SheetDescription>
                <div className="space-y-1.5">
                  <Badge className={CORES_CASA[alvo.casa].badge}>
                    {TITULO_CASA[alvo.casa]}
                  </Badge>
                  <h2 className={`font-display text-lg font-bold leading-tight ${CORES_CASA[alvo.casa].titulo}`}>
                    {alvo.titulo}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatarData(alvo.data)}
                    {alvo.status ? ` · ${alvo.status}` : ""}
                    {alvo.cliente ? ` · ${rotuloCliente(alvo.cliente)}` : ""}
                  </p>
                </div>
              </SheetHeader>

              <div className="flex flex-col gap-6 p-6">
                <section className="space-y-3">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Ementa / Resumo
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {alvo.ementa || "Ementa não disponível para esta proposição."}
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground/80">Autor:</span>{" "}
                      {autorComPartido(alvo)}
                    </p>
                    {alvo.comissao && (
                      <p>
                        <span className="font-medium text-foreground/80">Comissão:</span>{" "}
                        {alvo.comissao}
                      </p>
                    )}
                    {alvo.relator && (
                      <p>
                        <span className="font-medium text-foreground/80">Relator:</span>{" "}
                        {alvo.relator}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Copiar / Compartilhar
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => copiarTexto(alvo.titulo, "Título")}>
                      <Copy className="h-4 w-4" /> Copiar título
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => copiarTexto(alvo.ementa, "Ementa")}>
                      <Clipboard className="h-4 w-4" /> Copiar ementa
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => copiarTexto(montarClipping([alvo]), "Clipping")}>
                      <Send className="h-4 w-4" /> Copiar clipping
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 justify-start" onClick={() => copiarTexto(alvo.link ?? "", "Link")} disabled={!alvo.link}>
                      <Link2 className="h-4 w-4" /> Copiar link
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    O clipping copiado segue o padrão do WhatsApp, com título em negrito, link da
                    fonte oficial, autor e data.
                  </p>
                </section>

                {alvo.link && (
                  <section>
                    <a
                      href={alvo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir na fonte oficial ↗
                    </a>
                  </section>
                )}

                {alvo.cliente && (
                  <section className="rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm text-foreground/90">
                    Acompanhado pelo cliente{" "}
                    <strong className="text-foreground">{rotuloCliente(alvo.cliente)}</strong> — a
                    varredura futura inclui as palavras-chave desse perfil.
                  </section>
                )}
              </div>

              <div className="sticky bottom-0 z-10 border-t border-border/70 bg-background/90 p-4 backdrop-blur-xl">
                <Button className="w-full gap-1.5" onClick={() => adicionarUnica(alvo)}>
                  <Pin className="h-4 w-4" /> Adicionar ao Monitoramento
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}