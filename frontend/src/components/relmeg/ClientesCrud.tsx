import { useEffect, useState } from "react";
import { Cloud, CloudOff, Loader2, Plus, Pencil, Trash2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adicionarCliente,
  atualizarCliente,
  removerCliente,
  setClienteAtivo,
  substituirClientes,
  useRelmeg,
} from "@/lib/relmeg/store";
import {
  excluirClienteNaNuvem,
  sincronizarClientesComNuvem,
  usuarioIdSupabase,
} from "@/lib/relmeg/cloud";
import { slugDe } from "@/lib/relmeg/clientes";
import type { ClienteDef } from "@/lib/relmeg/types";

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

export function ClientesCrud() {
  const { clientes, clienteAtivo } = useRelmeg();
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<ClienteDef | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<ClienteDef | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [statusNuvem, setStatusNuvem] = useState<"nuvem" | "local" | "dado">("dado");

  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [palavras, setPalavras] = useState("");

  useEffect(() => {
    let ativo = true;
    void (async () => {
      setSincronizando(true);
      try {
        const resultado = await sincronizarClientesComNuvem(useRelmeg.getState().clientes);
        if (!ativo) return;
        if (resultado.nuvem) substituirClientes(resultado.clientes);
        setStatusNuvem(resultado.nuvem ? "nuvem" : "local");
      } catch {
        if (ativo) setStatusNuvem("local");
      } finally {
        if (ativo) setSincronizando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setSetor("");
    setPalavras("");
    setFormAberto(true);
  }

  function abrirEdicao(cliente: ClienteDef) {
    setEditando(cliente);
    setNome(cliente.label);
    setSetor(cliente.setor ?? "");
    setPalavras((cliente.palavrasChave ?? []).join(", "));
    setFormAberto(true);
  }

  async function aplicarSincronizacao() {
    setSincronizando(true);
    try {
      const resultado = await sincronizarClientesComNuvem(useRelmeg.getState().clientes);
      if (resultado.nuvem) {
        substituirClientes(resultado.clientes);
        setStatusNuvem("nuvem");
      } else {
        setStatusNuvem("local");
      }
    } finally {
      setSincronizando(false);
    }
  }

  async function salvar() {
    const label = nome.trim();
    if (!label) {
      toast.error("Informe o nome do cliente/projeto.");
      return;
    }
    const palavraLista = separarPalavras(palavras);
    const chave = editando?.key || slugDe(label);
    if (!chave) {
      toast.error("Não foi possível gerar a chave do cliente.");
      return;
    }
    const payload: ClienteDef = {
      key: chave,
      label: label,
      ...(setor.trim() ? { setor: setor.trim() } : {}),
      palavrasChave: palavraLista,
    };
    if (editando) atualizarCliente(payload);
    else adicionarCliente(payload);
    setFormAberto(false);
    await aplicarSincronizacao();
    toast.success(
      statusNuvem === "nuvem"
        ? `Cliente "${label}" salvo e sincronizado na nuvem.`
        : `Cliente "${label}" salvo localmente.`,
    );
  }

  async function excluir() {
    if (!confirmarExclusao) return;
    const alvo = confirmarExclusao;
    setConfirmarExclusao(null);
    const userId = await usuarioIdSupabase();
    try {
      if (userId) await excluirClienteNaNuvem(userId, alvo.key);
    } catch {
      // segue local mesmo se a nuvem falhar
    }
    removerCliente(alvo.key);
    await aplicarSincronizacao();
    toast.success(`Cliente "${alvo.label}" removido.`);
  }

  return (
    <div className="panel panel-hover rise-in rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Clientes / Projetos (CRUD)</h2>
          <p className="text-sm text-muted-foreground">
            Crie, edite ou remova clientes do zero — com nome, setor e palavras-chave de
            monitoramento. O cliente ativo escopa as abas da plataforma.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`gap-1 font-normal ${
              statusNuvem === "nuvem"
                ? "border-success/40 text-success"
                : statusNuvem === "local"
                  ? "border-warning/40 text-warning"
                  : ""
            }`}
          >
            {sincronizando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : statusNuvem === "nuvem" ? (
              <Cloud className="h-3.5 w-3.5" />
            ) : statusNuvem === "local" ? (
              <CloudOff className="h-3.5 w-3.5" />
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )}
            {sincronizando
              ? "Sincronizando…"
              : statusNuvem === "nuvem"
                ? "Sincronizado com a nuvem"
                : statusNuvem === "local"
                  ? "Somente local (sem sessão na nuvem)"
                  : "Nuvem"}
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void aplicarSincronizacao()} disabled={sincronizando}>
            <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {clientes.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
            Nenhum cliente cadastrado. Crie o primeiro para começar a monitorar.
          </p>
        ) : (
          clientes.map((cliente) => {
            const ativo = clienteAtivo === cliente.key;
            return (
              <div
                key={cliente.key}
                className={`rounded-lg border p-3 transition-colors ${
                  ativo ? "border-primary/50 bg-primary/5" : "border-border/70"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{cliente.label}</span>
                      {ativo && (
                        <Badge className="gap-1 bg-primary text-primary-foreground">
                          <Play className="h-3 w-3" /> Ativo
                        </Badge>
                      )}
                      {cliente.setor && (
                        <Badge variant="secondary" className="font-normal text-muted-foreground">
                          {cliente.setor}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground/60">{cliente.key}</span>
                    </div>
                    {(cliente.palavrasChave ?? []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(cliente.palavrasChave ?? []).slice(0, 6).map((palavra) => (
                          <Badge key={palavra} variant="outline" className="font-normal text-muted-foreground">
                            {palavra}
                          </Badge>
                        ))}
                        {(cliente.palavrasChave ?? []).length > 6 && (
                          <span className="text-[11px] text-muted-foreground/70">
                            +{(cliente.palavrasChave ?? []).length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!ativo && (
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setClienteAtivo(cliente.key)}>
                        <Play className="h-3.5 w-3.5" /> Ativar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => abrirEdicao(cliente)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmarExclusao(cliente)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar cliente / projeto" : "Novo cliente / projeto"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "Altere os dados do cliente. As palavras-chave atualizam o recorte de monitoramento das abas."
                : "Defina nome, setor e palavras-chave. A chave da URL é gerada automaticamente a partir do nome."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cliente-nome">Nome</Label>
              <Input
                id="cliente-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: NovoCliente Energia"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cliente-setor">Setor</Label>
              <Input
                id="cliente-setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                placeholder="Ex.: Mineração, Saúde, Agronegócio…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cliente-palavras">Palavras-chave de monitoramento</Label>
              <Textarea
                id="cliente-palavras"
                rows={3}
                value={palavras}
                onChange={(e) => setPalavras(e.target.value)}
                placeholder="Separe por vírgula ou linha. Ex.: ferro, mineradora, licenciamento, PPP…"
              />
              <p className="text-[11px] text-muted-foreground">
                Usadas para filtrar proposições da Câmara, matérias do Senado e publicações do DOU
                conforme o cliente ativo.
              </p>
            </div>
            {!editando && nome.trim() && (
              <p className="text-xs text-muted-foreground">
                Chave gerada:{" "}
                <code className="rounded bg-secondary/60 px-1">{slugDe(nome) || "—"}</code>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()}>
              {editando ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmarExclusao)} onOpenChange={(aberto) => !aberto && setConfirmarExclusao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente/projeto?</DialogTitle>
            <DialogDescription>
              Remover <strong>{confirmarExclusao?.label}</strong> também o remove da nuvem. Os
              registros já monitorados continuam na base, mas perdem o vínculo com o cliente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmarExclusao(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void excluir()}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}