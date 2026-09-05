import { useEffect, useState } from "react";
import { Star, Link2, ExternalLink, StickyNote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  autorComPartido,
  formatarData,
  linkProposicao,
  tituloProposicao,
} from "@/lib/relmeg/clipping";
import { rotuloCliente } from "@/lib/relmeg/store";

export interface CardExecutivoAcoes {
  onToggleFavorito?: ((id: string) => void) | undefined;
  onVerDetalhes?: ((item: any) => void) | undefined;
  onAnexarNota?: ((item: any, nota: string) => void) | undefined;
}

export function linkDe(item: any): string | undefined {
  return linkProposicao(item);
}

function tagsDe(item: any): string[] {
  const tags: string[] = [];
  const status = String(item.status || item.situacao || item.descricaoSituacao || "").trim();
  if (status && status !== "Em monitoramento") tags.push(status);
  const orgao = String(item.comissao || item.orgao || item.secao || item.tipo || "").trim();
  if (orgao) tags.push(orgao);
  const categoria = String(item.categoria || item.origemCategoria || "").trim();
  if (categoria && categoria !== "monitoramento") tags.push(rotuloCliente(categoria));
  if (item.cliente) {
    const cliente = String(item.cliente).trim();
    if (cliente) tags.push(rotuloCliente(cliente));
  }
  return tags;
}

function copiar(item: any) {
  const texto = tituloProposicao(item);
  const link = linkDe(item);
  const alvo = link ?? (texto !== "Sem título" ? texto : "");
  if (!alvo) {
    toast.info("Este registro não tem link nem título para copiar.");
    return;
  }
  void navigator.clipboard
    .writeText(alvo)
    .then(() => toast.success(`Link copiado: ${alvo.slice(0, 60)}${alvo.length > 60 ? "…" : ""}`))
    .catch(() => toast.error("Não foi possível copiar. Bloqueio de área de transferência."));
}

interface NotaDialogProps {
  item: any;
  aberto: boolean;
  onClose: () => void;
  onSalvar: (item: any, nota: string) => void;
}

function NotaDialog({ item, aberto, onClose, onSalvar }: NotaDialogProps) {
  const [nota, setNota] = useState("");

  useEffect(() => {
    if (aberto) setNota(String(item?.anotacoes ?? ""));
  }, [aberto, item]);

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar nota — {tituloProposicao(item)}</DialogTitle>
          <DialogDescription>
            A nota fica vinculada a este registro para a equipe consultar depois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nota-executiva">Nota executiva / memorando interno</Label>
          <Textarea
            id="nota-executiva"
            rows={4}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ex.: falar com o relator antes da pauta; alinhar com o cliente o posicionamento…"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSalvar(item, nota.trim());
              onClose();
            }}
          >
            Salvar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CardExecutivo({
  item,
  favorito,
  indice = 0,
  acoes,
}: {
  item: any;
  favorito: boolean;
  indice?: number;
  acoes?: CardExecutivoAcoes | undefined;
}) {
  const [dialogNota, setDialogNota] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const titulo = tituloProposicao(item);
  const ementa = String(
    item.ementa || item.ementa1 || item.resumo || item.descricao || "",
  ).trim();
  const autor = autorComPartido(item);
  const data = formatarData(item.data || item.atualizacao);
  const tags = tagsDe(item);
  const possuiLink = Boolean(linkDe(item));

  function copiarComFeedback() {
    setCopiando(true);
    setTimeout(() => setCopiando(false), 900);
    copiar(item);
  }

  return (
    <article
      className="group relative flex flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-all animate-in fade-in-50 duration-200 hover:border-primary/40 hover:shadow-md"
      style={{ animationDelay: `${Math.min(indice, 12) * 35}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-bold text-foreground">{titulo}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatarData(data)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
            title={favorito ? "Remover dos favoritos" : "Favoritar"}
            onClick={() => acoes?.onToggleFavorito?.(String(item.id ?? ""))}
          >
            <Star
              className={`h-4 w-4 transition-colors ${
                favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Copiar link"
            title="Copiar link"
            onClick={copiarComFeedback}
          >
            {copiando ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Link2 className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-foreground/90">
        {ementa || "—"}
      </p>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {autor !== "—" && (
          <p>
            <span className="font-medium text-foreground/80">Autor:</span> {autor}
          </p>
        )}
        {possuiLink && (
          <a
            href={linkDe(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" /> Abrir original
          </a>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {(acoes?.onVerDetalhes || acoes?.onAnexarNota) && (
        <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
          {acoes?.onVerDetalhes && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => acoes?.onVerDetalhes?.(item)}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver Detalhes
            </Button>
          )}
          {acoes?.onAnexarNota && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => setDialogNota(true)}
            >
              <StickyNote className="h-3.5 w-3.5" /> Anexar Nota
            </Button>
          )}
        </div>
      )}

      {acoes?.onAnexarNota && (
        <NotaDialog
          item={item}
          aberto={dialogNota}
          onClose={() => setDialogNota(false)}
          onSalvar={acoes.onAnexarNota}
        />
      )}
    </article>
  );
}

export function CardsGrid({
  data,
  loading,
  favoritos = [],
  indiceInicial = 0,
  acoes,
}: {
  data: any[];
  loading?: boolean | undefined;
  favoritos?: string[];
  indiceInicial?: number;
  acoes?: CardExecutivoAcoes | undefined;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`skeleton-card-${i}`}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-full space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 bg-card/50 px-4 py-14 text-center">
        <p className="text-sm font-medium text-foreground">Nenhum registro encontrado</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Ajuste os filtros de busca ou atualize a base para carregar dados.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((item, i) => (
        <CardExecutivo
          key={String(item.id ?? `card-${indiceInicial + i}`)}
          item={item}
          indice={indiceInicial + i}
          favorito={favoritos.includes(String(item.id ?? ""))}
          acoes={acoes}
        />
      ))}
    </div>
  );
}