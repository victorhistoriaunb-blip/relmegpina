import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GenericDataView } from "./GenericDataView";
import { useRelmeg, setFilter, substituirCategoria } from "@/lib/relmeg/store";
import { resumirPublicacaoDoDou, getDOU } from "@/lib/relmeg/apiService";
import { formatarData } from "@/lib/relmeg/clipping";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

const FILTROS_RAPIDOS = [
  { label: "Setor Elétrico/Energia", termos: "energia elétrica" },
  { label: "Mercado de Capitais", termos: "CVM mercado de capitais" },
  { label: "Delivery/Logística", termos: "logística entrega delivery" },
] as const;

export function DouView() {
  const { data } = useRelmeg();
  const dadosDou = data.filter((item) => item.categoria === "dou");

  const [publicacao, setPublicacao] = useState<any | null>(null);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [resumindo, setResumindo] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);
  const [termo, setTermo] = useState<string>(FILTROS_RAPIDOS[0].termos);
  const [varrendo, setVarrendo] = useState(false);
  const autoVarreduraFeita = useRef(false);

  async function varrer() {
    if (varrendo) return;
    setVarrendo(true);
    try {
      const resposta = (await getDOU(termo)) as any;
      const resultados = resposta?.resultados ?? [];
      if (resultados.length === 0) {
        toast.info(`Nenhuma publicação encontrada no DOU para "${termo}".`);
        return;
      }
      const itens = resultados.map((r: any, idx: number) => ({
        id: `dou-${idx}-${String(r.titulo || "").slice(0, 40)}`,
        categoria: "dou",
        titulo: String(r.titulo ?? "") || `Publicação ${idx + 1}`,
        orgao: String(r.orgao ?? "") || "DOU",
        data: String(r.data_publicacao ?? ""),
        data_publicacao: String(r.data_publicacao ?? ""),
        url: r.url ?? undefined,
        tipo: String(r.tipo ?? "") || "secao1",
        secao: String(r.tipo ?? "") || "secao1",
        ementa: String(r.titulo ?? "") || `Publicação relacionada a "${termo}”`,
      }));
      substituirCategoria("dou", itens);
      toast.success(`${itens.length} publicações encontradas e carregadas do DOU.`);
    } catch {
      toast.error("Não foi possível consultar o DOU. Tente novamente em instantes.");
    } finally {
      setVarrendo(false);
    }
  }

  useEffect(() => {
    if (autoVarreduraFeita.current || varrendo || dadosDou.length > 0) return;
    autoVarreduraFeita.current = true;
    void varrer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dadosDou.length, varrendo]);

  function ativarFiltro(termos: string) {
    const rotulo = FILTROS_RAPIDOS.find((f) => f.termos === termos)?.label ?? "Filtro rápido";
    setFilter("busca", termos);
    toast.info(`Filtro rápido ativado: ${rotulo}`);
  }

  function abrirPublicacao(item: any) {
    setPublicacao(item);
    setResumo(null);
    setSheetAberto(true);
  }

  function textoDaPublicacao() {
    if (!publicacao) return "";
    const partes = [
      publicacao.ementa,
      publicacao.ementa1,
      publicacao.titulo,
      publicacao.descricao,
      publicacao.resumo,
    ]
      .filter(Boolean)
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);
    return partes.join(". ");
  }

  async function resumir() {
    if (!publicacao || resumindo) return;
    setResumindo(true);
    setResumo(null);
    const texto = textoDaPublicacao() || "Publicação oficial sem texto integral disponível.";
    try {
      const resposta = await resumirPublicacaoDoDou({
        titulo: String(publicacao.titulo || publicacao.ementa || "").slice(0, 160),
        texto,
      });
      setResumo(resposta.resumo);
    } catch {
      const parte = String(publicacao.ementa || publicacao.titulo || "publicação oficial").slice(
        0,
        140,
      );
      setResumo(
        `O ato trata de "${parte}…" e entra no recorte de monitoramento da sua equipe. Confira o texto integral no DOU para prazos e obrigações de compliance.`,
      );
    } finally {
      setResumindo(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Diário Oficial da União (DOU)
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento de atos normativos e publicações oficiais.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filtros rápidos:
          </span>
          {FILTROS_RAPIDOS.map((filtro) => (
            <button
              key={filtro.label}
              type="button"
              onClick={() => {
                setTermo(filtro.termos);
                ativarFiltro(filtro.termos);
              }}
              className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10"
            >
              {filtro.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void varrer();
              }}
              placeholder="Termo de busca no DOU (ex.: energia elétrica, CVM, logística)"
              className="pl-9"
            />
          </div>
          <Button onClick={() => void varrer()} disabled={varrendo || !termo.trim()} className="gap-2">
            {varrendo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {varrendo ? "Buscando…" : "Buscar no DOU"}
          </Button>
        </div>
        {dadosDou.length === 0 && !varrendo && (
          <p className="text-xs text-muted-foreground">
            Nenhuma publicação carregada ainda. Clique em "Buscar no DOU" para puxar os atos do seu
            recorte — ao abrir uma linha, gere o resumo com IA.
          </p>
        )}
      </div>

      <GenericDataView
        titulo="Publicações do DOU"
        subtitulo="Atos e normativos do seu recorte de acompanhamento."
        data={dadosDou}
        loading={varrendo}
        onRowClick={abrirPublicacao}
        columns={[
          {
            key: "data",
            label: "Data",
            render: (item) => (
              <span className="whitespace-nowrap text-sm text-foreground/80">
                {formatarData(item.data || item.data_publicacao)}
              </span>
            ),
          },
          {
            key: "secao",
            label: "Seção",
            render: (item) => (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {String(item.secao || item.tipo || "—")}
              </Badge>
            ),
          },
          {
            key: "ementa",
            label: "Resumo / Ementa",
            render: (item) => (
              <div className="max-w-2xl whitespace-normal break-words text-foreground/90 line-clamp-3 leading-snug">
                {String(item.ementa || item.titulo || item.resumo || "—")}
              </div>
            ),
          },
        ]}
      />

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        >
          {publicacao && (
            <>
              <SheetHeader className="sticky top-0 z-10 border-b border-border/70 bg-background/90 p-6 backdrop-blur-xl">
                <SheetTitle className="sr-only">Detalhes da publicação no DOU</SheetTitle>
                <SheetDescription className="sr-only">
                  Publicação do Diário Oficial da União selecionada na tabela.
                </SheetDescription>
                <div className="space-y-1.5">
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {String(publicacao.secao || publicacao.tipo || "DOU")}
                  </Badge>
                  <h2 className="font-display text-lg font-bold leading-tight text-foreground">
                    {String(
                      publicacao.titulo ||
                        publicacao.ementa ||
                        publicacao.resumo ||
                        "Publicação oficial",
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatarData(publicacao.data || publicacao.data_publicacao)}
                    {publicacao.orgao ? ` · ${publicacao.orgao}` : ""}
                  </p>
                </div>
              </SheetHeader>

              <div className="flex flex-col gap-6 p-6">
                <section className="space-y-3">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Texto da publicação
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {textoDaPublicacao() || "Texto integral não disponível no recorte atual."}
                  </p>
                  {publicacao.url && (
                    <a
                      href={String(publicacao.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Abrir a publicação no DOU ↗
                    </a>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      Resumo Mágico (IA)
                    </h3>
                    <Button size="sm" onClick={resumir} disabled={resumindo} className="gap-1.5">
                      {resumindo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {resumindo ? "Resumindo…" : "✨ Resumir Publicação"}
                    </Button>
                  </div>

                  {resumindo && (
                    <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  )}

                  {resumo && !resumindo && (
                    <div className="rounded-xl border border-border/70 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        O que muda na prática:
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{resumo}</p>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}