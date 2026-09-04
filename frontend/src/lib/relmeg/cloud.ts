import { supabase } from "@/integrations/supabase/client";
import type { Parlamentar } from "./types";

export const CAMPOS_DB = [
  "nome",
  "partido",
  "uf",
  "cargo",
  "interesse1",
  "interesse2",
  "contrario1",
  "contrario2",
  "setor1",
  "setor2",
  "setor3",
  "descricao",
  "proposicao1",
  "ementa1",
  "link1",
  "proposicao2",
  "ementa2",
  "link2",
  "proposicao3",
  "ementa3",
  "link3",
  "anotacoes",
] as const;

type CampoDB = (typeof CAMPOS_DB)[number];

type Linha = Record<string, unknown> & { id: string };

export function paraParlamentar(linha: Linha): Parlamentar {
  const p = { id: String(linha["id"]) } as Parlamentar;
  for (const campo of CAMPOS_DB) {
    (p as Record<string, unknown>)[campo] = String(linha[campo] ?? "");
  }
  return p;
}

export function paraLinha(p: Partial<Parlamentar>): Partial<Record<CampoDB, string>> {
  const linha: Partial<Record<CampoDB, string>> = {};
  for (const campo of CAMPOS_DB) {
    const valor = p[campo as CampoDB];
    if (valor !== undefined) linha[campo] = String(valor ?? "");
  }
  return linha;
}

export async function listarParlamentares(): Promise<Parlamentar[]> {
  const { data, error } = await supabase
    .from("parlamentares")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((linha) => paraParlamentar(linha as Linha));
}

export async function inserirParlamentares(userId: string, rows: Partial<Parlamentar>[]) {
  const payload = rows.map((r) => ({ ...paraLinha(r), user_id: userId }));
  const { data, error } = await supabase.from("parlamentares").insert(payload).select("*");
  if (error) throw error;
  return (data ?? []).map((linha) => paraParlamentar(linha as Linha));
}

export async function atualizarParlamentarNaNuvem(id: string, patch: Partial<Parlamentar>) {
  const { error } = await supabase.from("parlamentares").update(paraLinha(patch)).eq("id", id);
  if (error) throw error;
}

export async function excluirParlamentarDaNuvem(id: string) {
  const { error } = await supabase.from("parlamentares").delete().eq("id", id);
  if (error) throw error;
}

export async function limparBaseNaNuvem(userId: string) {
  const { error } = await supabase.from("parlamentares").delete().eq("user_id", userId);
  if (error) throw error;
}

/** Retorna o id do usuário autenticado no Supabase (ou null se não estiver logado). */
export async function usuarioIdSupabase(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}