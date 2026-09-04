/**
 * Autenticação da plataforma (usuário único nesta versão).
 * O login é convertido em uma conta na nuvem, o que mantém os dados
 * vinculados ao usuário e sincronizados entre dispositivos.
 * A estrutura permite, no futuro, múltiplos usuários sem grandes alterações.
 */
import { supabase } from "@/integrations/supabase/client";

const DOMINIO_INTERNO = "relmeg.app";

export type Usuario = { login: string; nome: string };

export const USUARIO_PADRAO = { login: "admin", senha: "relgov2026", nome: "Admin" };

export function normalizarLogin(login: string) {
  return login.trim().toLowerCase();
}

export function emailDe(login: string) {
  return `${normalizarLogin(login)}@${DOMINIO_INTERNO}`;
}

function nomeDe(login: string, meta?: Record<string, unknown> | null) {
  const nome = meta?.["nome"];
  if (typeof nome === "string" && nome.trim()) return nome;
  return login.charAt(0).toUpperCase() + login.slice(1);
}

export async function autenticar(login: string, senha: string): Promise<Usuario | null> {
  const alvo = normalizarLogin(login);
  const email = emailDe(alvo);

  let resultado = await supabase.auth.signInWithPassword({ email, password: senha });

  // Primeiro acesso do usuário padrão: cria a conta na nuvem automaticamente.
  if (resultado.error && alvo === USUARIO_PADRAO.login && senha === USUARIO_PADRAO.senha) {
    const criacao = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome: USUARIO_PADRAO.nome, login: alvo } },
    });
    if (!criacao.error) {
      resultado = await supabase.auth.signInWithPassword({ email, password: senha });
    }
  }

  if (resultado.error || !resultado.data.user) return null;
  return { login: alvo, nome: nomeDe(alvo, resultado.data.user.user_metadata) };
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  const login = data.user.email.split("@")[0] ?? "admin";
  return { login, nome: nomeDe(login, data.user.user_metadata) };
}

export async function encerrarSessao() {
  await supabase.auth.signOut();
}

export async function alterarSenha(login: string, senhaAtual: string, novaSenha: string): Promise<boolean> {
  const conferencia = await supabase.auth.signInWithPassword({
    email: emailDe(login),
    password: senhaAtual,
  });
  if (conferencia.error) return false;
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  return !error;
}
