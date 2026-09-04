import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  LogOut,
  UploadCloud,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  limparBase,
  logout,
  resetTextos,
  substituirBase,
  setTexto,
  useRelmeg,
} from "@/lib/relmeg/store";
import { CAMPOS_TEXTO } from "@/lib/relmeg/textos";
import {
  OBRIGATORIOS,
  setoresDe,
  temasContrariosDe,
  temasInteresseDe,
  type Parlamentar,
} from "@/lib/relmeg/types";
import type { ParseResult } from "@/lib/relmeg/parse";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Importação de Base | RelMeg" },
      {
        name: "description",
        content:
          "Painel administrativo do RelMeg para importar planilhas, conferir dados e editar textos da plataforma.",
      },
      { property: "og:title", content: "Admin — Importação de Base | RelMeg" },
      {
        property: "og:description",
        content: "Importe, valide e gerencie sua base de parlamentares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data, textos } = useRelmeg();
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setCarregando(true);
    try {
      const { parseFile } = await import("@/lib/relmeg/parse");
      const resultado = await parseFile(file);
      if (resultado.rows.length === 0) {
        toast.error("Nenhuma linha válida encontrada. Verifique a coluna 'Nome'.");
        setPreview(null);
      } else {
        setPreview(resultado);
        toast.success(`${resultado.rows.length} registros lidos do arquivo`);
      }
    } catch {
      toast.error("Não foi possível ler o arquivo. Use .xlsx ou .csv.");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmar() {
    if (!preview) return;
    setCarregando(true);
    try {
      await substituirBase(preview.rows);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Base importada e salva na nuvem");
    } catch {
      toast.error("Não foi possível salvar a base na nuvem");
    } finally {
      setCarregando(false);
    }
  }

  const faltandoObrigatorio = preview
    ? OBRIGATORIOS.filter((c) => preview.faltantes.includes(c.label)).map((c) => c.label)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Importação da base, conferência dos dados e edição dos textos da plataforma.
          </p>
        </div>
        <Button variant="ghost" onClick={() => logout()}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>

      <div className="panel panel-hover rise-in rounded-xl p-6">
        <h2 className="font-display text-base font-semibold">Importar planilha</h2>
        <p className="text-sm text-muted-foreground">
          Formatos aceitos: Excel (.xlsx, .xls) e CSV. A importação substitui a base atual.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="max-w-sm"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            onClick={async () => {
              const { baixarModelo } = await import("@/lib/relmeg/parse");
              baixarModelo();
            }}
          >
            <Download className="h-4 w-4" /> Baixar modelo
          </Button>
          {carregando && <span className="text-sm text-muted-foreground">Lendo arquivo…</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {OBRIGATORIOS.map((c) => (
            <Badge
              key={c.key}
              variant="outline"
              className="border-primary/40 font-normal text-primary"
            >
              {c.label} *
            </Badge>
          ))}
        </div>
      </div>

      {preview && (
        <div className="panel rise-in space-y-4 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">
              Conferência — {preview.rows.length} registros
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={faltandoObrigatorio.length > 0}>
                <UploadCloud className="h-4 w-4" /> Confirmar importação
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-success" /> Colunas reconhecidas
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preview.reconhecidos.map((c) => (
                  <Badge key={c} variant="secondary" className="font-normal">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-warning" /> Colunas não encontradas
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preview.faltantes.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Nenhuma — planilha completa.
                  </span>
                ) : (
                  preview.faltantes.map((c) => (
                    <Badge key={c} variant="outline" className="font-normal">
                      {c}
                    </Badge>
                  ))
                )}
              </div>
              {faltandoObrigatorio.length > 0 && (
                <p className="mt-2 text-xs text-destructive">
                  Campos obrigatórios ausentes: {faltandoObrigatorio.join(", ")}. Ajuste a planilha
                  para continuar.
                </p>
              )}
            </div>
          </div>

          <Tabela rows={preview.rows.slice(0, 8)} />
        </div>
      )}

      <div className="panel panel-hover rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold">Base carregada</h2>
            <p className="text-sm text-muted-foreground">
              {data.length} parlamentares salvos na nuvem e vinculados à sua conta.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={data.length === 0}
            onClick={async () => {
              try {
                await limparBase();
                toast.success("Base removida");
              } catch {
                toast.error("Não foi possível remover a base");
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Limpar base
          </Button>
        </div>
        {data.length > 0 && (
          <div className="mt-4">
            <Tabela rows={data.slice(0, 20)} />
          </div>
        )}
      </div>

      <div className="panel panel-hover rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold">Textos da plataforma</h2>
            <p className="text-sm text-muted-foreground">
              Personalize os títulos e descrições exibidos nas páginas.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              resetTextos();
              toast.success("Textos restaurados");
            }}
          >
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CAMPOS_TEXTO.map((campo) => (
            <div key={campo.key} className="space-y-1.5">
              <Label htmlFor={campo.key}>{campo.label}</Label>
              {campo.multi ? (
                <Textarea
                  id={campo.key}
                  rows={2}
                  value={textos[campo.key]}
                  onChange={(e) => setTexto(campo.key, e.target.value)}
                />
              ) : (
                <Input
                  id={campo.key}
                  value={textos[campo.key]}
                  onChange={(e) => setTexto(campo.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="pt-2 text-center text-xs text-muted-foreground/70">Criado por Victor Souza</p>
    </div>
  );
}

function Tabela({ rows }: { rows: Parlamentar[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-foreground">Nome</TableHead>
            <TableHead className="text-foreground">Partido</TableHead>
            <TableHead className="text-foreground">UF</TableHead>
            <TableHead className="text-foreground">Cargo</TableHead>
            <TableHead className="text-foreground">Temas de Interesse</TableHead>
            <TableHead className="text-foreground">Temas Contrários</TableHead>
            <TableHead className="text-foreground">Setores</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-foreground">{p.nome}</TableCell>
              <TableCell className="text-foreground/90">{p.partido}</TableCell>
              <TableCell className="text-foreground/90">{p.uf}</TableCell>
              <TableCell className="text-foreground/90">{p.cargo}</TableCell>
              <TableCell className="text-success">
                {temasInteresseDe(p).join(", ") || "—"}
              </TableCell>
              <TableCell className="text-destructive">
                {temasContrariosDe(p).join(", ") || "—"}
              </TableCell>
              <TableCell className="text-foreground/80">{setoresDe(p).join(", ") || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
