import { useMemo, useState, useEffect, useRef } from "react";
import {
  Sparkles,
  SquareCheck,
  Send,
  Inbox,
  RefreshCw,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRelmeg, setClienteAtivo } from "@/lib/relmeg/store";
import { exportarClippingParaWhatsApp, formatarData, autorComPartido } from "@/lib/relmeg/clipping";
import { getCamaraResumo, getSenadoResumo } from "@/lib/relmeg/apiService";
import { exportarCSV, exportarXLSX } from "@/lib/relmeg/export";
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
  cliente: string;
  status?: string;
}

type ClienteKey = "family-talks" | "action" | "energia" | "mercado-de-capitais";

const CLIENTES_DISPONIVEIS: Record<ClienteKey, string> = {
  "family-talks": "Family Talks",
  action: "Action",
  energia: "Energia",
  "mercado-de-capitais": "Mercado de Capitais",
};

const TITULO_CASA: Record<Casa, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
};

const AMOSTRA: NovaProposicao[] = [
  {
    id: "np-5149",
    casa: "camara",
    titulo: "PL 5149/2026",
    ementa:
      "Institui o Programa Nacional de Infraestrutura de Recarga para Veículos Elétricos (PNIRE), estabelece metas de universalização de eletropostos em rodovias federais e incentivos fiscais à instalação de pontos de recarga.",
    autor: "Marina Duarte",
    partido: "PSB",
    uf: "PE",
    data: "2026-08-22",
    link: "https://www.camara.leg.br/busca/?q=PL%205149/2026",
    cliente: "energia",
    status: "Aguardando designação de relator",
  },
  {
    id: "np-5287",
    casa: "camara",
    titulo: "PL 5287/2026",
    ementa:
      "Institui a Política Nacional de Assistência Técnica e Extensão para a Mineração Artesanal e de Pequena Escala (PNAT-MAPE) e o Programa Nacional de Assistência Técnica e Extensão para a Mineração Artesanal e de Pequena Escala (PRONAT-MAPE).",
    autor: "João Almeida",
    partido: "PSD",
    uf: "MG",
    data: "2026-08-26",
    link: "https://www.camara.leg.br/busca/?q=PL%205287/2026",
    cliente: "energia",
  },
  {
    id: "np-5209",
    casa: "camara",
    titulo: "PL 5209/2026",
    ementa:
      "Estabelece normas gerais específicas para o licenciamento ambiental de centros de dados e estende incentivos de infraestrutura para data centers no país.",
    autor: "Carla Moreira",
    partido: "PL",
    uf: "SP",
    data: "2026-08-20",
    link: "https://www.camara.leg.br/busca/?q=PL%205209/2026",
    cliente: "mercado-de-capitais",
    status: "Pronto para pauta",
  },
  {
    id: "np-5198",
    casa: "camara",
    titulo: "PL 5198/2026",
    ementa:
      "Altera a Lei nº 15.190, de 8 de agosto de 2025, para dispor sobre a não sujeição a licenciamento ambiental da instalação e da operação de centrais de microgeração e minigeração distribuída de energia elétrica a partir de fonte solar fotovoltaica.",
    autor: "Renan Tavares",
    partido: "UNIÃO",
    uf: "BA",
    data: "2026-08-18",
    link: "https://www.camara.leg.br/busca/?q=PL%205198/2026",
    cliente: "energia",
  },
  {
    id: "np-4555",
    casa: "camara",
    titulo: "PL 4555/2026",
    ementa:
      "Dispõe sobre a proteção de dados pessoais de crianças e adolescentes no ambiente digital e reforça o dever de verificação de idade por parte de provedores de aplicações.",
    autor: "Érica Santos",
    partido: "PSOL",
    uf: "RJ",
    data: "2026-07-10",
    link: "https://www.camara.leg.br/busca/?q=PL%204555/2026",
    cliente: "family-talks",
    status: "Em análise na comissão",
  },
  {
    id: "np-4111",
    casa: "camara",
    titulo: "PL 4111/2026",
    ementa:
      "Institui a Política Nacional de Pronta Resposta a Desastres Naturais, com diretrizes para alerta antecipado à população e coordenação entre União, estados e municípios.",
    autor: "Gustavo Penha",
    partido: "PSDB",
    uf: "SC",
    data: "2026-06-15",
    link: "https://www.camara.leg.br/busca/?q=PL%204111/2026",
    cliente: "action",
    status: "Aguardando parecer",
  },
  {
    id: "np-998",
    casa: "senado",
    titulo: "PDL 998/2026",
    ementa:
      "Susta os efeitos do art. 4º e dos dispositivos correlatos da Resolução Normativa ANEEL nº 1.122, de 20 de maio de 2025, que instituem exigência de garantias financeiras para o acesso de unidades consumidoras e de agentes de geração à Rede Básica do Sistema Interligado Nacional.",
    autor: "Paulo Braga",
    partido: "PL",
    uf: "AM",
    data: "2026-08-25",
    link: "https://www25.senado.leg.br/web/atividade/materias",
    cliente: "mercado-de-capitais",
    status: "Comissão de Infraestrutura",
  },
];

function atribuirCliente(texto: string): ClienteKey {
  const t = (texto || "").toLowerCase();
  if (
    /(cvm|mercado de capitais|título de capital|ações|bolsa|investimento|fintech|criptoativo|centros de dados|garantias financeiras|poupança)/.test(t)
  ) {
    return "mercado-de-capitais";
  }
  if (
    /(criança|adolescente|família|infância|dados pessoais|idade|educação|socioeduca)/.test(t)
  ) {
    return "family-talks";
  }
  if (/(desastre|alerta|emergência|socorro|defesa civil|pronta resposta|vigilância)/.test(t)) {
    return "action";
  }
  return "energia";
}

function converterDaBase(item: any, idx: number): NovaProposicao {
  const casa: Casa = item.categoria === "senado" ? "senado" : "camara";
  const sigla = String(item.sigla || item.siglaTipo || "").trim();
  const numero = String(item.numero ?? "").trim();
  const ano = String(item.ano ?? "").trim();
  const semAno = [sigla, numero].filter(Boolean).join(" ");
  const titulo =
    String(item.titulo || "").trim() || (ano && semAno ? `${semAno}/${ano}` : semAno);
  const texto = String(item.ementa || item.titulo || "");
  const link = String(item.link || item.link1 || item.uri || "").trim();

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
    cliente: atribuirCliente(texto),
    ...(item.situacao || item.status
      ? { status: String(item.situacao || item.status || "").trim() }
      : {}),
  };
}

export function NovasProposicoesView() {
  const { data, clienteAtivo, clientes } = useRelmeg();
  const cliente = clienteAtivo || "todos";
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);

  const proposicoes = useMemo(() => {
    const daBase = data
      .filter((item) => item.categoria === "camara" || item.categoria === "senado")
      .map(converterDaBase);
    return daBase.length > 0 ? daBase : AMOSTRA;
  }, [data]);

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
      const [camara, senado] = await Promise.all([getCamaraResumo(), getSenadoResumo()]);
      const camaraItens = ((camara as any)?.proposicoes ?? []).map((p: any) => ({
        id: String(p.id),
        categoria: "camara",
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

  return (
    <div className={`space-y-6 ${selecionadas.size > 0 ? "pb-24" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Novas Proposições
          </h1>
          <p className="text-sm text-muted-foreground">
            Projetos recém-apresentados organizados por cliente/tema.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cliente / Tema</label>
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
          <div className="flex items-end gap-2">
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
                exportarXLSX(filtradas as unknown as Record<string, unknown>[], "novas-proposicoes");
                toast.success("Planilha XLSX exportada com sucesso.");
              }}
              disabled={filtradas.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">XLSX</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={atualizarBase}
              disabled={carregando}
              className="gap-2"
            >
              {carregando ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {carregando ? "Buscando…" : "Atualizar base"}
              </span>
            </Button>
            <Button variant="outline" size="sm" onClick={selecionarFiltradas} className="gap-2">
              <SquareCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Selecionar resultados</span>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          Clique em "Atualizar base" para puxar proposições reais dos endpoints{" "}
          <code className="rounded bg-secondary/60 px-1">/api/camara</code> e{" "}
          <code className="rounded bg-secondary/60 px-1">/api/senado</code>.
        </p>
      </div>

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
            >
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
          <p className="text-sm font-medium text-foreground">Nenhuma proposição para este cliente</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Selecione outro cliente ou volte para "Todos os Clientes/Temas".
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((p, i) => (
            <article
              key={p.id}
              className={`relative rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors ${
                selecionadas.has(p.id) ? "bg-primary/5 ring-1 ring-primary/40" : "hover:bg-secondary/20"
              } animate-in fade-in-50 duration-200`}
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {p.link ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words text-red-600 hover:underline"
                      title={`Abrir ${p.titulo} em nova aba`}
                    >
                      <span className="font-bold">{p.titulo}</span>
                    </a>
                  ) : (
                    <h3 className="break-words font-bold text-red-600">{p.titulo}</h3>
                  )}
                  <p className="text-xs text-muted-foreground">{TITULO_CASA[p.casa]}</p>
                </div>
                <Checkbox
                  checked={selecionadas.has(p.id)}
                  onCheckedChange={() => alternarItem(p.id)}
                  aria-label={`Selecionar ${p.titulo}`}
                />
              </div>

              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{p.ementa}</p>

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
                <Badge variant="secondary" className="font-normal">
                  {CLIENTES_DISPONIVEIS[p.cliente as ClienteKey] ?? "Energia"}
                </Badge>
                {p.status && (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {p.status}
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
            <Button variant="secondary" size="sm" className="gap-2 rounded-full border border-border/70" onClick={exportar}>
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
    </div>
  );
}