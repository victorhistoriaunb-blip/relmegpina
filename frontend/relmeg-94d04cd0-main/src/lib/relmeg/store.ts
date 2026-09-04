import { useSyncExternalStore } from "react";
import { EMPTY_FILTERS, type Filters, type Parlamentar } from "./types";
import { TEXTOS_PADRAO, type Textos } from "./textos";
import { mesclarPrefs, PREFS_PADRAO, type CardPref, type Prefs } from "./prefs";
import { supabase } from "@/integrations/supabase/client";
import { usuarioAtual, encerrarSessao } from "./auth";
import {
  atualizarParlamentarNaNuvem,
  excluirParlamentarDaNuvem,
  inserirParlamentares,
  limparBaseNaNuvem,
  listarParlamentares,
} from "./cloud";

const TEXTOS_KEY = "relmeg:textos";
const PREFS_KEY = "relmeg:prefs";

export type Sessao = { login: string; nome: string } | null;

type State = {
  data: Parlamentar[];
  filters: Filters;
  textos: Textos;
  prefs: Prefs;
  sessao: Sessao;
  auth: boolean;
  loaded: boolean;
  carregandoBase: boolean;
  sincronizando: boolean;
};

let state: State = {
  data: [],
  filters: EMPTY_FILTERS,
  textos: TEXTOS_PADRAO,
  prefs: PREFS_PADRAO,
  sessao: null,
  auth: false,
  loaded: false,
  carregandoBase: false,
  sincronizando: false,
};
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

function hydrate() {
  if (state.loaded || typeof window === "undefined") return;
  try {
    const textos = window.localStorage.getItem(TEXTOS_KEY);
    if (textos) state.textos = { ...TEXTOS_PADRAO, ...(JSON.parse(textos) as Partial<Textos>) };
    const prefs = window.localStorage.getItem(PREFS_KEY);
    state.prefs = mesclarPrefs(prefs ? (JSON.parse(prefs) as Partial<Prefs>) : null);
  } catch {
    state.data = [];
  }
  state.loaded = true;
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: State = {
  data: [],
  filters: EMPTY_FILTERS,
  textos: TEXTOS_PADRAO,
  prefs: PREFS_PADRAO,
  sessao: null,
  auth: false,
  loaded: false,
  carregandoBase: false,
  sincronizando: false,
};

export function useRelmeg() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

/* ------------------------------ Base na nuvem ----------------------------- */

let canal: ReturnType<typeof supabase.channel> | null = null;
let userId: string | null = null;

function ordenar(rows: Parlamentar[]) {
  return [...rows].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function recarregarBase() {
  if (!state.auth) return;
  state.carregandoBase = true;
  emit();
  try {
    state.data = ordenar(await listarParlamentares());
  } catch {
    state.data = [];
  } finally {
    state.carregandoBase = false;
    emit();
  }
}

function ouvirMudancas() {
  if (canal || !userId) return;
  canal = supabase
    .channel("parlamentares-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "parlamentares", filter: `user_id=eq.${userId}` },
      () => {
        void recarregarBase();
      },
    )
    .subscribe();
}

function pararDeOuvir() {
  if (canal) {
    supabase.removeChannel(canal);
    canal = null;
  }
}

export async function iniciarSessao() {
  hydrate();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;
  if (user) {
    userId = user.id;
    const atual = await usuarioAtual();
    state.sessao = atual;
    state.auth = true;
    emit();
    await recarregarBase();
    ouvirMudancas();
  } else {
    userId = null;
    state.sessao = null;
    state.auth = false;
    state.data = [];
    emit();
  }
}

/** Substitui toda a base do usuário (usado na importação de planilha). */
export async function substituirBase(rows: Parlamentar[]) {
  if (!userId) return;
  state.sincronizando = true;
  emit();
  try {
    await limparBaseNaNuvem(userId);
    const criados = rows.length ? await inserirParlamentares(userId, rows) : [];
    state.data = ordenar(criados);
  } finally {
    state.sincronizando = false;
    emit();
  }
}

export async function limparBase() {
  if (!userId) return;
  await limparBaseNaNuvem(userId);
  state.data = [];
  emit();
}

export async function criarParlamentar(): Promise<Parlamentar | null> {
  if (!userId) return null;
  const [criado] = await inserirParlamentares(userId, [{ nome: "Novo parlamentar" }]);
  if (!criado) return null;
  state.data = ordenar([...state.data, criado]);
  emit();
  return criado;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pendentes = new Map<string, Partial<Parlamentar>>();

/** Atualização otimista com salvamento automático (sem botão salvar). */
export function editarParlamentar(id: string, patch: Partial<Parlamentar>) {
  state.data = state.data.map((p) => (p.id === id ? { ...p, ...patch } : p));
  state.sincronizando = true;
  emit();

  pendentes.set(id, { ...(pendentes.get(id) ?? {}), ...patch });
  const anterior = timers.get(id);
  if (anterior) clearTimeout(anterior);
  timers.set(
    id,
    setTimeout(async () => {
      const dados = pendentes.get(id) ?? {};
      pendentes.delete(id);
      timers.delete(id);
      try {
        await atualizarParlamentarNaNuvem(id, dados);
      } finally {
        if (timers.size === 0) {
          state.sincronizando = false;
          emit();
        }
      }
    }, 600),
  );
}

export async function excluirParlamentar(id: string) {
  await excluirParlamentarDaNuvem(id);
  state.data = state.data.filter((p) => p.id !== id);
  emit();
}

export function setFilter(key: keyof Filters, value: string) {
  state.filters = { ...state.filters, [key]: value };
  emit();
}

export function clearFilters() {
  state.filters = EMPTY_FILTERS;
  emit();
}

export function setTexto(key: keyof Textos, value: string) {
  state.textos = { ...state.textos, [key]: value };
  if (typeof window !== "undefined") window.localStorage.setItem(TEXTOS_KEY, JSON.stringify(state.textos));
  emit();
}

export function resetTextos() {
  state.textos = TEXTOS_PADRAO;
  if (typeof window !== "undefined") window.localStorage.removeItem(TEXTOS_KEY);
  emit();
}

export async function login(sessao: NonNullable<Sessao>) {
  const { data } = await supabase.auth.getSession();
  userId = data.session?.user.id ?? null;
  state.sessao = sessao;
  state.auth = true;
  emit();
  await recarregarBase();
  ouvirMudancas();
}

export async function logout() {
  pararDeOuvir();
  await encerrarSessao();
  userId = null;
  state.sessao = null;
  state.auth = false;
  state.data = [];
  emit();
}

function persistirPrefs() {
  if (typeof window !== "undefined") window.localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
  emit();
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  state.prefs = { ...state.prefs, [key]: value };
  persistirPrefs();
}

export function atualizarCard(grupo: "kpis" | "paineis", key: string, patch: Partial<CardPref>) {
  state.prefs = {
    ...state.prefs,
    [grupo]: state.prefs[grupo].map((c) => (c.key === key ? { ...c, ...patch } : c)),
  };
  persistirPrefs();
}

export function moverCard(grupo: "kpis" | "paineis", key: string, direcao: -1 | 1) {
  const lista = [...state.prefs[grupo]];
  const i = lista.findIndex((c) => c.key === key);
  const j = i + direcao;
  if (i === -1 || j < 0 || j >= lista.length) return;
  const a = lista[i]!;
  const b = lista[j]!;
  lista[i] = b;
  lista[j] = a;
  state.prefs = { ...state.prefs, [grupo]: lista };
  persistirPrefs();
}

export function resetPrefs() {
  state.prefs = mesclarPrefs(null);
  if (typeof window !== "undefined") window.localStorage.removeItem(PREFS_KEY);
  emit();
}
