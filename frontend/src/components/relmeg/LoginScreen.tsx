import { iniciarSessao } from '@/lib/relmeg/store';
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "./Logo";
import { login as entrarNaSessao } from "@/lib/relmeg/store";
import { autenticar } from "@/lib/relmeg/auth";

export function LoginScreen() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !senha) {
      toast.error("Informe usuÃ¡rio e senha");
      return;
    }
    setCarregando(true);
    try {
      const encontrado = await autenticar(usuario, senha);
      if (encontrado) {
        await (iniciarSessao as any)({ login: encontrado.login, nome: encontrado.nome });
        toast.success(`Bem-vindo, ${encontrado.nome}`);
      } else {
        toast.error("Credenciais invÃ¡lidas");
        setCarregando(false);
      }
    } catch {
      toast.error("NÃ£o foi possÃ­vel conectar. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <div className="aurora relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="grid-veil" aria-hidden="true" />
      <div className="rise-in relative w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <span className="glow-ring flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Logo className="h-14 w-14" />
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">RelMeg</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            InteligÃªncia Legislativa
          </p>
        </div>

        <form onSubmit={entrar} className="panel mt-8 space-y-5 rounded-xl p-7">
          <div className="space-y-2">
            <Label htmlFor="usuario">UsuÃ¡rio</Label>
            <Input
              id="usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}

