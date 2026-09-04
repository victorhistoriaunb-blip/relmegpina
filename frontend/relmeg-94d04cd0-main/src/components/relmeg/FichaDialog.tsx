import { useState } from "react";
import { FileDown, Loader2, Presentation, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const set = <K extends keyof FichaConfig>(key: K, value: FichaConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const alternarGrafico = (key: GraficoKey, on: boolean) =>
    set("graficos", on ? [...config.graficos, key] : config.graficos.filter((k) => k !== key));

  const alternarCampo = (key: string, on: boolean) =>
    set("campos", on ? [...config.campos, key] : config.campos.filter((k) => k !== key));

  async function exportar(tipo: "pdf" | "pptx") {
    if (data.length === 0) {
      toast.error("Nenhum parlamentar no recorte atual.");
      return;
    }
    setGerando(tipo);
    try {
      if (tipo === "pdf") await gerarPdf(config, data, filters);
      else await gerarPptx(config, data, filters);
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
            <div className="grid gap-1.5 sm:max-w-52">
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