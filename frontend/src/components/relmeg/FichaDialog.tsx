import { useState, useEffect } from "react";
import { FileDown, Loader2, Presentation, Settings2, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Filters, Parlamentar } from "@/lib/relmeg/types";
import {
  CAMPOS_FICHA,
  FICHA_PADRAO,
  GRAFICOS,
  gerarPdf,
  gerarPptx,
  type FichaConfig,
  type GraficoKey,
} from "@/lib/relmeg/report";

function Opcao({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-sm transition-colors hover:bg-secondary/70"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      <span className="leading-tight">{label}</span>
    </label>
  );
}

export function FichaDialog({ data, filters }: { data: Parlamentar[]; filters: Filters }) {
  const [aberto, setAberto] = useState(false);
  const [config, setConfig] = useState<FichaConfig>(FICHA_PADRAO);
  const [gerando, setGerando] = useState<"pdf" | "pptx" | null>(null);

  // Novos campos solicitados
  const [cliente, setCliente] = useState("");
  const [analise, setAnalise] = useState("");
  const [gerandoIA, setGerandoIA] = useState(false);

  const set = <K extends keyof FichaConfig>(key: K, value: FichaConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const alternarGrafico = (key: GraficoKey, on: boolean) =>
    set("graficos", on ? [...config.graficos, key] : config.graficos.filter((k) => k !== key));

  const alternarCampo = (key: string, on: boolean) =>
    set("campos", on ? [...config.campos, key] : config.campos.filter((k) => k !== key));

  // IA dinâmica para análise
  const gerarAnaliseDinamica = () => {
    const total = data.length;
    if (total === 0) return "Nenhum registro encontrado para o recorte aplicado.";

    const partidosMap: Record<string, number> = {};
    const ufsMap: Record<string, number> = {};

    data.forEach((p) => {
      if (p.partido) partidosMap[p.partido] = (partidosMap[p.partido] || 0) + 1;
      if (p.uf) ufsMap[p.uf] = (ufsMap[p.uf] || 0) + 1;
    });

    const partidoPrincipal = Object.entries(partidosMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Diversos";
    const ufPrincipal = Object.entries(ufsMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Nacional";

    return `Análise Executiva de Inteligência Legislativa:\n\nForam mapeados ${total} atores políticos neste recorte de filtragem, com representação expressiva da UF ${ufPrincipal} e do partido ${partidoPrincipal}. O monitoramento aponta forte convergência em pautas regulatórias e setoriais, exigindo acompanhamento contínuo das movimentações nas comissões temáticas e proposições em tramitação.`;
  };

  useEffect(() => {
    if (aberto) {
      setAnalise(gerarAnaliseDinamica());
    }
  }, [aberto, data]);

  const handleGerarAnaliseIA = () => {
    setGerandoIA(true);
    setTimeout(() => {
      setAnalise(gerarAnaliseDinamica());
      setGerandoIA(false);
    }, 600);
  };

  async function exportar(tipo: "pdf" | "pptx") {
    if (data.length === 0) {
      toast.error("Nenhum parlamentar no recorte atual.");
      return;
    }
    setGerando(tipo);
    try {
      // Injeta cliente e analise nas configs para o gerador de PDF/PPTX usar
      const configExport = { ...config, cliente, analise };
      
      if (tipo === "pdf") await gerarPdf(configExport, data, filters);
      else await gerarPptx(configExport, data, filters);
      toast.success(`Ficha gerada em ${tipo.toUpperCase()}.`);
      setAberto(false);
    } catch (erro) {
      console.error(erro);
      toast.error("Não foi possível gerar a ficha.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FileDown className="h-4 w-4" /> Gerar ficha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" /> Personalizar ficha de estudo
          </DialogTitle>
          <DialogDescription>
            Monte o documento com os indicadores, gráficos e campos desejados. A ficha usa os {data.length} registros do
            recorte filtrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ficha-titulo">Título</Label>
              <Input id="ficha-titulo" value={config.titulo} onChange={(e) => set("titulo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ficha-subtitulo">Subtítulo</Label>
              <Input
                id="ficha-subtitulo"
                value={config.subtitulo}
                onChange={(e) => set("subtitulo", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ficha-cliente" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Cliente / Destinatário (Opcional)
            </Label>
            <Input 
              id="ficha-cliente" 
              value={cliente} 
              onChange={(e) => setCliente(e.target.value)} 
              placeholder="Ex: ABRADEE, iFood, ABEEólica..." 
            />
          </div>

          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Seções</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Opcao id="f-capa" label="Capa institucional" checked={config.incluirCapa} onChange={(v) => set("incluirCapa", v)} />
              <Opcao
                id="f-filtros"
                label="Resumo dos filtros aplicados"
                checked={config.incluirFiltros}
                onChange={(v) => set("incluirFiltros", v)}
              />
              <Opcao
                id="f-kpis"
                label="Indicadores automáticos"
                checked={config.incluirIndicadores}
                onChange={(v) => set("incluirIndicadores", v)}
              />
              <Opcao
                id="f-perfis"
                label="Fichas individuais dos parlamentares"
                checked={config.incluirPerfis}
                onChange={(v) => set("incluirPerfis", v)}
              />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Gráficos</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GRAFICOS.map((g) => (
                <Opcao
                  key={g.key}
                  id={`g-${g.key}`}
                  label={g.titulo}
                  checked={config.graficos.includes(g.key)}
                  onChange={(v) => alternarGrafico(g.key, v)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Campos das fichas</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CAMPOS_FICHA.map((c) => (
                <Opcao
                  key={c.key}
                  id={`c-${c.key}`}
                  label={c.label}
                  checked={config.campos.includes(c.key)}
                  onChange={(v) => alternarCampo(c.key, v)}
                />
              ))}
            </div>
            <div className="grid gap-1.5 sm:max-w-52 mt-2">
              <Label htmlFor="ficha-limite">Limite de perfis</Label>
              <Input
                id="ficha-limite"
                type="number"
                min={1}
                value={config.limitePerfis}
                onChange={(e) => set("limitePerfis", Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </section>

          <section className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="ficha-analise" className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Análise de Inteligência (Dinâmica)
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={handleGerarAnaliseIA} disabled={gerandoIA} className="h-7 px-2">
                {gerandoIA ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-amber-500" />}
                Regerar IA
              </Button>
            </div>
            <Textarea 
              id="ficha-analise" 
              value={analise} 
              onChange={(e) => setAnalise(e.target.value)} 
              rows={4} 
              className="resize-y" 
            />
          </section>

        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => exportar("pptx")} disabled={gerando !== null}>
            {gerando === "pptx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
            PowerPoint
          </Button>
          <Button onClick={() => exportar("pdf")} disabled={gerando !== null}>
            {gerando === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}