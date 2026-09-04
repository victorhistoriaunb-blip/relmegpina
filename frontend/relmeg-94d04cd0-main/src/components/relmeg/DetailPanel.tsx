import { Copy, Check, ExternalLink, Pencil, Eye, Trash2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { editarParlamentar, excluirParlamentar, useRelmeg } from "@/lib/relmeg/store";
import {
  briefing,
  proposicoesDe,
  setoresDe,
  temasContrariosDe,
  temasInteresseDe,
  CAMPOS,
  type Parlamentar,
} from "@/lib/relmeg/types";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{titulo}</h3>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

const CAMPOS_LONGOS = new Set(["descricao", "anotacoes", "ementa1", "ementa2", "ementa3"]);

function Editor({ parlamentar }: { parlamentar: Parlamentar }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CAMPOS.map((campo) => {
        const longo = CAMPOS_LONGOS.has(campo.key);
        const valor = parlamentar[campo.key] ?? "";
        return (
          <div key={campo.key} className={`space-y-1.5 ${longo ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={`${parlamentar.id}-${campo.key}`} className="text-xs text-muted-foreground">
              {campo.label}
              {campo.obrigatorio && <span className="text-destructive"> *</span>}
            </Label>
            {longo ? (
              <Textarea
                id={`${parlamentar.id}-${campo.key}`}
                rows={3}
                value={valor}
                onChange={(e) => editarParlamentar(parlamentar.id, { [campo.key]: e.target.value })}
              />
            ) : (
              <Input
                id={`${parlamentar.id}-${campo.key}`}
                value={valor}
                onChange={(e) => editarParlamentar(parlamentar.id, { [campo.key]: e.target.value })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DetailPanel({
  parlamentarId,
  onClose,
  editarAoAbrir = false,
}: {
  parlamentarId: string | null;
  onClose: () => void;
  editarAoAbrir?: boolean;
}) {
  const { data, sincronizando } = useRelmeg();
  const parlamentar = data.find((p) => p.id === parlamentarId) ?? null;
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState(editarAoAbrir);

  useEffect(() => {
    if (parlamentarId) setEditando(editarAoAbrir);
  }, [parlamentarId, editarAoAbrir]);

  async function copiar() {
    if (!parlamentar) return;
    try {
      await navigator.clipboard.writeText(briefing(parlamentar));
      setCopiado(true);
      toast.success("Briefing copiado para a área de transferência");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o briefing");
    }
  }

  const proposicoes = parlamentar ? proposicoesDe(parlamentar) : [];

  return (
    <Sheet
      open={!!parlamentar}
      onOpenChange={(open) => {
        if (!open) {
          setEditando(false);
          onClose();
        }
      }}
    >
      <SheetContent className="w-full gap-0 border-border bg-card p-0 sm:max-w-xl">
        {parlamentar && (
          <>
            <SheetHeader className="border-b border-border p-4 sm:p-6">
              <SheetTitle className="font-display text-xl sm:text-2xl">
                {parlamentar.nome || "Sem nome"}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary">{parlamentar.cargo || "Cargo não informado"}</Badge>
                <Badge variant="outline">
                  {[parlamentar.partido, parlamentar.uf].filter(Boolean).join("/") || "—"}
                </Badge>
                {sincronizando && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> salvando…
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button size="sm" variant={editando ? "secondary" : "outline"} onClick={() => setEditando((v) => !v)}>
                  {editando ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {editando ? "Visualizar" : "Editar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={async () => {
                    try {
                      await excluirParlamentar(parlamentar.id);
                      onClose();
                      toast.success("Perfil excluído");
                    } catch {
                      toast.error("Não foi possível excluir o perfil");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-6 p-4 sm:p-6">
                {editando ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      As alterações são salvas automaticamente na nuvem.
                    </p>
                    <Editor parlamentar={parlamentar} />
                  </>
                ) : (
                  <>
                {temasInteresseDe(parlamentar).length > 0 && (
                  <Bloco titulo="Temas de Interesse">
                    <div className="flex flex-wrap gap-1.5">
                      {temasInteresseDe(parlamentar).map((t) => (
                        <Badge key={t} variant="outline" className="border-success/40 bg-success/15 text-success">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </Bloco>
                )}
                {temasContrariosDe(parlamentar).length > 0 && (
                  <Bloco titulo="Temas Contrários">
                    <div className="flex flex-wrap gap-1.5">
                      {temasContrariosDe(parlamentar).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="border-destructive/40 bg-destructive/15 text-destructive"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </Bloco>
                )}
                {setoresDe(parlamentar).length > 0 && (
                  <Bloco titulo="Setores">
                    <div className="flex flex-wrap gap-1.5">
                      {setoresDe(parlamentar).map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </Bloco>
                )}
                {parlamentar.descricao && <Bloco titulo="Breve descrição">{parlamentar.descricao}</Bloco>}
                {proposicoes.length > 0 && (
                  <Bloco titulo="Proposições">
                    <ul className="space-y-2">
                      {proposicoes.map((p, i) => (
                        <li
                          key={`${p.numero}-${i}`}
                          className="rounded-md border border-border bg-muted/40 px-3 py-2"
                        >
                          {p.numero && <p className="font-medium">{p.numero}</p>}
                          {p.ementa && <p className="mt-0.5 text-sm text-muted-foreground">{p.ementa}</p>}
                          {p.link && (
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Abrir proposição
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Bloco>
                )}
                {parlamentar.anotacoes && (
                  <Bloco titulo="Anotações internas">
                    <p className="rounded-md border border-dashed border-border px-3 py-2 text-muted-foreground">
                      {parlamentar.anotacoes}
                    </p>
                  </Bloco>
                )}
                  </>
                )}
              </div>
            </ScrollArea>
            <div className="border-t border-border p-4">
              <Button className="w-full" onClick={copiar}>
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copiar Briefing
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
