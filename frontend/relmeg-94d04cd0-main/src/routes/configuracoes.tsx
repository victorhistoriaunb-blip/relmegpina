import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, KeyRound, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  atualizarCard,
  moverCard,
  resetPrefs,
  setPref,
  useRelmeg,
} from "@/lib/relmeg/store";
import { alterarSenha } from "@/lib/relmeg/auth";
import type { CardPref } from "@/lib/relmeg/prefs";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da Plataforma | RelMeg" },
      {
        name: "description",
        content:
          "Personalize a visualização, organize os cards do dashboard, ajuste preferências e altere a senha de acesso do RelMeg.",
      },
      { property: "og:title", content: "Configurações da Plataforma | RelMeg" },
      { property: "og:description", content: "Personalize o RelMeg diretamente pela interface." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configuracoes,
});

function ListaCards({
  grupo,
  cards,
  titulo,
  descricao,
  comLimite,
}: {
  grupo: "kpis" | "paineis";
  cards: CardPref[];
  titulo: string;
  descricao: string;
  comLimite?: boolean;
}) {
  return (
    <div className="panel panel-hover rounded-xl p-6">
      <h2 className="font-display text-base font-semibold">{titulo}</h2>
      <p className="text-sm text-muted-foreground">{descricao}</p>
      <div className="mt-4 space-y-3">
        {cards.map((card, i) => (
          <div key={card.key} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {i + 1}. {card.key}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Mover para cima"
                  disabled={i === 0}
                  onClick={() => moverCard(grupo, card.key, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Mover para baixo"
                  disabled={i === cards.length - 1}
                  onClick={() => moverCard(grupo, card.key, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={card.visivel ? "Ocultar card" : "Exibir card"}
                  onClick={() => atualizarCard(grupo, card.key, { visivel: !card.visivel })}
                >
                  {card.visivel ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${grupo}-${card.key}-titulo`}>Título</Label>
                <Input
                  id={`${grupo}-${card.key}-titulo`}
                  value={card.titulo}
                  onChange={(e) => atualizarCard(grupo, card.key, { titulo: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${grupo}-${card.key}-desc`}>Descrição</Label>
                <Input
                  id={`${grupo}-${card.key}-desc`}
                  value={card.descricao}
                  onChange={(e) => atualizarCard(grupo, card.key, { descricao: e.target.value })}
                />
              </div>
              {comLimite && (
                <div className="space-y-1.5">
                  <Label htmlFor={`${grupo}-${card.key}-limite`}>Itens exibidos (0 = todos)</Label>
                  <Input
                    id={`${grupo}-${card.key}-limite`}
                    type="number"
                    min={0}
                    max={50}
                    value={card.limite ?? 0}
                    onChange={(e) =>
                      atualizarCard(grupo, card.key, { limite: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Configuracoes() {
  const { prefs, sessao } = useRelmeg();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!sessao) return;
    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres");
      return;
    }
    if (novaSenha !== confirmar) {
      toast.error("A confirmação não confere");
      return;
    }
    if (!(await alterarSenha(sessao.login, senhaAtual, novaSenha))) {
      toast.error("Senha atual incorreta");
      return;
    }
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmar("");
    toast.success("Senha alterada com sucesso");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Personalize a plataforma diretamente pela interface — sem editar código.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            resetPrefs();
            toast.success("Preferências restauradas");
          }}
        >
          <RotateCcw className="h-4 w-4" /> Restaurar padrão
        </Button>
      </div>

      <div className="panel panel-hover rounded-xl p-6">
        <h2 className="font-display text-base font-semibold">Preferências gerais</h2>
        <p className="text-sm text-muted-foreground">Saudação, identificação e visualização padrão.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="saudacao">Texto da saudação</Label>
            <Input
              id="saudacao"
              value={prefs.saudacao}
              onChange={(e) => setPref("saudacao", e.target.value)}
              placeholder="Olá"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nomeExibicao">Nome exibido</Label>
            <Input
              id="nomeExibicao"
              value={prefs.nomeExibicao}
              onChange={(e) => setPref("nomeExibicao", e.target.value)}
              placeholder="Admin"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label htmlFor="mostrarSaudacao">Exibir saudação no cabeçalho</Label>
            <Switch
              id="mostrarSaudacao"
              checked={prefs.mostrarSaudacao}
              onCheckedChange={(v) => setPref("mostrarSaudacao", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label htmlFor="mostrarKpisPerfis">Exibir indicadores na página Perfis</Label>
            <Switch
              id="mostrarKpisPerfis"
              checked={prefs.mostrarKpisPerfis}
              onCheckedChange={(v) => setPref("mostrarKpisPerfis", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3 md:col-span-2">
            <Label>Visualização padrão dos Perfis</Label>
            <div className="flex gap-1 rounded-md border border-border p-1">
              <Button
                size="sm"
                variant={prefs.visaoPadraoPerfis === "cards" ? "secondary" : "ghost"}
                onClick={() => setPref("visaoPadraoPerfis", "cards")}
              >
                Cards
              </Button>
              <Button
                size="sm"
                variant={prefs.visaoPadraoPerfis === "tabela" ? "secondary" : "ghost"}
                onClick={() => setPref("visaoPadraoPerfis", "tabela")}
              >
                Tabela
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ListaCards
        grupo="kpis"
        cards={prefs.kpis}
        titulo="Cards de indicadores"
        descricao="Edite os títulos, textos, ordem e visibilidade dos indicadores do topo."
      />

      <ListaCards
        grupo="paineis"
        cards={prefs.paineis}
        titulo="Cards do Dashboard"
        descricao="Edite títulos, descrições, quantidade de itens, ordem e visibilidade dos gráficos."
        comLimite
      />

      <div className="panel panel-hover rounded-xl p-6">
        <h2 className="font-display text-base font-semibold">Segurança</h2>
        <p className="text-sm text-muted-foreground">
          Altere a senha do usuário <strong className="text-foreground">{sessao?.login ?? "—"}</strong>.
        </p>
        <form onSubmit={salvarSenha} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="senhaAtual">Senha atual</Label>
            <Input
              id="senhaAtual"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="novaSenha">Nova senha</Label>
            <Input
              id="novaSenha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
            <Input
              id="confirmarSenha"
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">
              <KeyRound className="h-4 w-4" /> Alterar senha
            </Button>
          </div>
        </form>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Save className="h-3.5 w-3.5" /> Todas as alterações são salvas automaticamente neste navegador.
      </p>
    </div>
  );
}
