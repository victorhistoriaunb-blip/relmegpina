import { supabase } from "@/integrations/supabase/client";
import type { Parlamentar, ClienteDef } from "./types";

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

interface ClienteCloudRow {
  key: string;
  user_id: string;
  label: string;
  setor: string;
  palavras_chave: string[];
}

function clienteParaLinha(userId: string, c: ClienteDef) {
  return {
    user_id: userId,
    key: c.key,
    label: c.label ?? "",
    setor: c.setor ?? "",
    palavras_chave: c.palavrasChave ?? [],
  };
}

function linhaParaCliente(linha: ClienteCloudRow): ClienteDef {
  return {
    key: linha.key,
    label: linha.label,
    ...(linha.setor ? { setor: linha.setor } : {}),
    palavrasChave: linha.palavras_chave ?? [],
  };
}

export async function listarClientesParaUsuario(userId: string): Promise<ClienteDef[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("user_id", userId)
    .order("label", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((linha) => linhaParaCliente(linha as ClienteCloudRow));
}

export async function upsertClientesNaNuvem(userId: string, clientes: ClienteDef[]) {
  if (clientes.length === 0) return [];
  const payload = clientes.map((c) => clienteParaLinha(userId, c));
  const { data, error } = await supabase.from("clientes").upsert(payload, {
    onConflict: "user_id,key",
  });
  if (error) throw error;
  return (data ?? []).map((linha) => linhaParaCliente(linha as ClienteCloudRow));
}

export async function excluirClienteNaNuvem(userId: string, key: string) {
  const { error } = await supabase.from("clientes").delete().eq("user_id", userId).eq("key", key);
  if (error) throw error;
}

/**
 * Envia a lista local de clientes para a nuvem e devolve a lista reconciliada.
 * Se não houver sessão autenticada, mantém apenas o estado local.
 */
export async function sincronizarClientesComNuvem(
  clientes: ClienteDef[],
): Promise<{ nuvem: boolean; clientes: ClienteDef[] }> {
  const userId = await usuarioIdSupabase();
  if (!userId) return { nuvem: false, clientes };
  try {
    const salvos = await upsertClientesNaNuvem(userId, clientes);
    return {
      nuvem: true,
      clientes: salvos.length > 0 ? salvos : await listarClientesParaUsuario(userId),
    };
  } catch (err) {
    console.error("Falha ao sincronizar clientes na nuvem:", err);
    return { nuvem: false, clientes };
  }
}