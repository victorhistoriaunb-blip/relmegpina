import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Parlamentar, Filters, EMPTY_FILTERS, ClienteDef, Anexo, CLIENTES_DEFAULT } from "./types";
import { inserirParlamentares, usuarioIdSupabase } from "./cloud";
import { cargoLabel, type TseCandidato } from "./tse";

export type RelmegItem = Parlamentar & {
  categoria?: "camara" | "senado" | "dou" | "monitoramento" | string;
  [key: string]: any;
};

export interface CardPref {
  key: string;
  titulo: string;
  descricao?: string;
  visivel: boolean;
  limite?: number;
  tipo?: string;
  colunaOrigem?: string;
}

export interface RelmegPrefs {
  paineis: CardPref[];
  kpis: CardPref[];
  saudacao?: string;
  nomeExibicao?: string;
  mostrarSaudacao?: boolean;
  mostrarKpisPerfis?: boolean;
  visaoPadraoPerfis?: "cards" | "tabela";
  [key: string]: any;
}

interface RelmegState {
  data: RelmegItem[];
  filters: Filters;
  sincronizando: boolean;
  carregandoBase: boolean;
  usuario: string | null;
  sessao: { usuario: string | null } | null;
  estaAutenticado: boolean;
  textos: Record<string, string>;
  prefs: RelmegPrefs;

  clientes: ClienteDef[];
  clienteAtivo: string;
  favoritos: string[];
  anexos: Anexo[];

  setClienteAtivo: (key: string) => void;
  adicionarCliente: (cliente: ClienteDef) => void;
  removerCliente: (key: string) => void;
  toggleFavorito: (id: string) => void;
  adicionarAnexo: (anexo: Omit<Anexo, "id" | "data">) => void;
  removerAnexo: (id: string) => void;

  addItem: (item: Partial<RelmegItem>) => RelmegItem;
  removeItem: (id: string) => void;
  salvarCandidatosNoMonitoramento: (candidatos: TseCandidato[]) => Promise<number>;
  editarParlamentar: (id: string, updates: Partial<RelmegItem>) => void;
  excluirParlamentar: (id: string) => void;
  setAllData: (items: RelmegItem[]) => void;
  substituirBase: (items: RelmegItem[]) => void;
  substituirCategoria: (categoria: string, items: RelmegItem[]) => void;
  limparBase: () => void;

  setFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;

  setTexto: (chave: string, valor: string) => void;
  resetTextos: () => void;

  setPref: (keyOrPrefs: string | Partial<RelmegPrefs>, value?: any) => void;
  atualizarCard: (grupoOrKey: string, keyOrUpdates: any, updates?: Partial<CardPref>) => void;
  moverCard: (grupoOrKey: string, keyOrDirecao: any, direcaoOrStep?: any) => void;
  resetPrefs: () => void;

  iniciarSessao: (usuario?: any) => void;
  encerrarSessao: () => void;
  login: () => void;
  logout: () => void;
}

const dadosIniciais: RelmegItem[] = [
  {
    id: "parl-1",
    nome: "Dep. Exemplo Setorial",
    partido: "PL",
    uf: "SP",
    cargo: "Deputado Federal",
    categoria: "camara",
    interesse1: "Energia Renovavel",
    interesse2: "Marco Hidrico",
    contrario1: "Aumento de Subsidios",
    contrario2: "Tributacao sobre Geracao Distribuida",
    setor1: "Setor Eletrico",
    setor2: "Infraestrutura",
    setor3: "Mineracao",
    descricao:
      "Deputado atuante na Comissao de Minas e Energia, com foco em seguranca juridica para o setor.",
    proposicao1: "PL 4162/2024",
    ementa1: "Estabelece novas diretrizes para o marco regulatorio de transicao energetica.",
    link1: "https://camara.leg.br",
    proposicao2: "",
    ementa2: "",
    link2: "",
    proposicao3: "",
    ementa3: "",
    link3: "",
    anotacoes: "Interlocutor-chave para debates regulatorios e emendas setoriais.",
  },
];

const prefsIniciais: RelmegPrefs = {
  saudacao: "Bem-vindo ao RelMeg",
  nomeExibicao: "Equipe de Relacoes Governamentais",
  mostrarSaudacao: true,
  mostrarKpisPerfis: true,
  visaoPadraoPerfis: "cards",
  kpis: [
    { key: "total", titulo: "Total de Parlamentares", visivel: true },
    { key: "partidos", titulo: "Partidos Representados", visivel: true },
    { key: "proposicoes", titulo: "Proposicoes Monitoradas", visivel: true },
  ],
  paineis: [
    {
      key: "partido",
      titulo: "Parlamentares por Partido",
      descricao: "Distribuicao da base por legenda.",
      visivel: true,
      tipo: "barra",
    },
    {
      key: "setor",
      titulo: "Recorte Setorial",
      descricao: "Foco de atuacao por segmento produtivo.",
      visivel: true,
      tipo: "ranking",
    },
    {
      key: "interesse",
      titulo: "Temas de Interesse",
      descricao: "Pautas com maior convergencia de interlocucao.",
      visivel: true,
      tipo: "pizza",
    },
  ],
};

export const useRelmeg = create<RelmegState>()(
  persist(
    (set, get) => ({
      data: dadosIniciais,
      filters: EMPTY_FILTERS,
      sincronizando: false,
      carregandoBase: false,
      usuario: "Admin",
      sessao: { usuario: "Admin" },
      estaAutenticado: true,
      textos: {},
      prefs: prefsIniciais,

      clientes: CLIENTES_DEFAULT,
      clienteAtivo: "todos",
      favoritos: [],
      anexos: [],

      setClienteAtivo: (key) => set({ clienteAtivo: key }),

      adicionarCliente: (cliente) =>
        set((state) => ({
          clientes: state.clientes.some((c) => c.key === cliente.key)
            ? state.clientes
            : [...state.clientes, cliente],
        })),

      removerCliente: (key) =>
        set((state) => ({
          clientes: state.clientes.filter((c) => c.key !== key),
          clienteAtivo: state.clienteAtivo === key ? "todos" : state.clienteAtivo,
        })),

      toggleFavorito: (id) =>
        set((state) => ({
          favoritos: state.favoritos.includes(id)
            ? state.favoritos.filter((f) => f !== id)
            : [...state.favoritos, id],
        })),

      adicionarAnexo: (anexo) =>
        set((state) => ({
          anexos: [
            {
              ...anexo,
              id: `anexo-${Math.random().toString(36).substring(2, 9)}`,
              data: new Date().toISOString(),
            },
            ...state.anexos,
          ],
        })),

      removerAnexo: (id) =>
        set((state) => ({ anexos: state.anexos.filter((a) => a.id !== id) })),

      addItem: (newItem) => {
        const itemCompleto: RelmegItem = {
          id: Math.random().toString(36).substring(2, 9),
          nome: "",
          partido: "",
          uf: "",
          cargo: "",
          interesse1: "",
          interesse2: "",
          contrario1: "",
          contrario2: "",
          setor1: "",
          setor2: "",
          setor3: "",
          descricao: "",
          proposicao1: "",
          ementa1: "",
          link1: "",
          proposicao2: "",
          ementa2: "",
          link2: "",
          proposicao3: "",
          ementa3: "",
          link3: "",
          anotacoes: "",
          ...newItem,
        };
        set((state) => ({ data: [itemCompleto, ...state.data] }));
        return itemCompleto;
      },

      removeItem: (id) =>
        set((state) => ({
          data: state.data.filter((item) => item.id !== id),
        })),

      salvarCandidatosNoMonitoramento: async (candidatos) => {
        const { data } = get();
        const monitorados = new Set(
          data.filter((item) => item.categoria === "monitoramento").map((item) => item.nome),
        );
        const novos = candidatos.filter((c) => !monitorados.has(c.nomeCompleto));
        if (novos.length === 0) return 0;

        const linhas = novos.map((c) => ({
          nome: c.nomeCompleto,
          partido: c.siglaPartido ?? "",
          uf: c.uf,
          cargo: cargoLabel(c.codigoCargo),
          interesse1: `Candidato ${c.codigoCargo ? cargoLabel(c.codigoCargo) : ""}`.trim(),
          descricao: c.descricaoSituacao ?? "",
        }));

        let erroNuvem: unknown = null;
        try {
          const userId = await usuarioIdSupabase();
          if (userId) await inserirParlamentares(userId, linhas);
          else erroNuvem = new Error("Sessão na nuvem indisponível.");
        } catch (err) {
          erroNuvem = err;
        }

        const hoje = new Date().toLocaleDateString("pt-BR");
        for (const c of novos) {
          const { id, ...resto } = c;
          get().addItem({
            ...resto,
            id: String(id),
            categoria: "monitoramento",
            nome: c.nomeCompleto,
            partido: c.siglaPartido ?? "",
            uf: c.uf,
            cargo: cargoLabel(c.codigoCargo),
            interesse1: cargoLabel(c.codigoCargo),
            descricao: c.descricaoSituacao ?? "",
            proposicao1: `Candidato nº ${c.numero ?? "—"}`,
            link1: c.fotoUrl ?? "",
            titulo: [c.siglaPartido, c.numero].filter(Boolean).join(" "),
            status: "Em monitoramento",
            atualizacao: hoje,
          });
        }

        if (erroNuvem) {
          const detalhe =
            erroNuvem instanceof Error && erroNuvem.message ? ` ${erroNuvem.message}` : "";
          throw new Error(`Salvo localmente, mas não foi possível sincronizar na nuvem.${detalhe}`);
        }
        return novos.length;
      },

      editarParlamentar: (id, updates) =>
        set((state) => ({
          data: state.data.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        })),

      excluirParlamentar: (id) =>
        set((state) => ({
          data: state.data.filter((item) => item.id !== id),
        })),

      setAllData: (items) => set({ data: items }),
      substituirBase: (items) => set({ data: items }),
      substituirCategoria: (categoria, items) =>
        set((state) => ({
          data: [...items, ...state.data.filter((item) => item.categoria !== categoria)],
        })),
      limparBase: () => set({ data: [] }),

      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),

      clearFilters: () => set({ filters: EMPTY_FILTERS }),

      setTexto: (chave, valor) => set((state) => ({ textos: { ...state.textos, [chave]: valor } })),
      resetTextos: () => set({ textos: {} }),

      setPref: (keyOrPrefs, value) =>
        set((state) => {
          if (typeof keyOrPrefs === "string") {
            return { prefs: { ...state.prefs, [keyOrPrefs]: value } };
          }
          return { prefs: { ...state.prefs, ...keyOrPrefs } };
        }),

      atualizarCard: (arg1, arg2, arg3) =>
        set((state) => {
          let grupo: "paineis" | "kpis" = "paineis";
          let key = "";
          let updates: Partial<CardPref> = {};

          if (arg3 !== undefined) {
            grupo = arg1 === "kpis" ? "kpis" : "paineis";
            key = arg2;
            updates = arg3;
          } else {
            key = arg1;
            updates = arg2;
          }

          const lista = state.prefs[grupo] || [];
          return {
            prefs: {
              ...state.prefs,
              [grupo]: lista.map((card) => (card.key === key ? { ...card, ...updates } : card)),
            },
          };
        }),

      moverCard: (arg1, arg2, arg3) =>
        set((state) => {
          let grupo: "paineis" | "kpis" = "paineis";
          let key = "";
          let direcao: "cima" | "baixo" = "cima";

          if (arg3 !== undefined) {
            grupo = arg1 === "kpis" ? "kpis" : "paineis";
            key = arg2;
            direcao = arg3 === -1 || arg3 === "cima" ? "cima" : "baixo";
          } else {
            key = arg1;
            direcao = arg2;
          }

          const lista = [...(state.prefs[grupo] || [])];
          const index = lista.findIndex((c) => c.key === key);
          if (index < 0) return state;

          const targetIndex = direcao === "cima" ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= lista.length) return state;

          const itemOrigem = lista[index];
          const itemDestino = lista[targetIndex];
          if (!itemOrigem || !itemDestino) return state;

          lista[index] = itemDestino;
          lista[targetIndex] = itemOrigem;

          return {
            prefs: {
              ...state.prefs,
              [grupo]: lista,
            },
          };
        }),

      resetPrefs: () => set({ prefs: prefsIniciais }),

      iniciarSessao: (usuario = "Admin") => {
        const nomeUsuario =
          typeof usuario === "string" ? usuario : usuario?.nome || usuario?.login || "Admin";
        set({
          usuario: nomeUsuario,
          sessao: { usuario: nomeUsuario },
          estaAutenticado: true,
        });
      },

      encerrarSessao: () => set({ usuario: null, sessao: null, estaAutenticado: false }),
      login: () => set({ usuario: "Admin", sessao: { usuario: "Admin" }, estaAutenticado: true }),
      logout: () => set({ usuario: null, sessao: null, estaAutenticado: false }),
    }),
    {
      name: "relmeg-storage-local",
    },
  ),
);

export const limparBase = () => useRelmeg.getState().limparBase();
export const substituirBase = (items: RelmegItem[]) => useRelmeg.getState().substituirBase(items);
export const substituirCategoria = (categoria: string, items: RelmegItem[]) =>
  useRelmeg.getState().substituirCategoria(categoria, items);
export const editarParlamentar = (id: string, updates: Partial<RelmegItem>) =>
  useRelmeg.getState().editarParlamentar(id, updates);
export const excluirParlamentar = (id: string) => useRelmeg.getState().excluirParlamentar(id);
export const setFilter = (key: keyof Filters, value: string) =>
  useRelmeg.getState().setFilter(key, value);
export const clearFilters = () => useRelmeg.getState().clearFilters();
export const setTexto = (chave: string, valor: string) =>
  useRelmeg.getState().setTexto(chave, valor);
export const resetTextos = () => useRelmeg.getState().resetTextos();
export const atualizarCard = (grupoOrKey: string, keyOrUpdates: any, updates?: Partial<CardPref>) =>
  useRelmeg.getState().atualizarCard(grupoOrKey, keyOrUpdates, updates);
export const moverCard = (grupoOrKey: string, keyOrDirecao: any, direcaoOrStep?: any) =>
  useRelmeg.getState().moverCard(grupoOrKey, keyOrDirecao, direcaoOrStep);
export const resetPrefs = () => useRelmeg.getState().resetPrefs();
export const setPref = (keyOrPrefs: string | Partial<RelmegPrefs>, value?: any) =>
  useRelmeg.getState().setPref(keyOrPrefs, value);
export function criarParlamentar(): RelmegItem | null {
  const item = useRelmeg.getState().addItem({ nome: "Novo parlamentar" });
  return item;
}
export const salvarCandidatosNoMonitoramento = (candidatos: TseCandidato[]) =>
  useRelmeg.getState().salvarCandidatosNoMonitoramento(candidatos);
export const iniciarSessao = (usuario?: any) => useRelmeg.getState().iniciarSessao(usuario);
export const encerrarSessao = () => useRelmeg.getState().encerrarSessao();
export const login = () => useRelmeg.getState().login();
export const logout = () => useRelmeg.getState().logout();
export const setClienteAtivo = (key: string) => useRelmeg.getState().setClienteAtivo(key);
export const adicionarCliente = (cliente: ClienteDef) =>
  useRelmeg.getState().adicionarCliente(cliente);
export const removerCliente = (key: string) => useRelmeg.getState().removerCliente(key);
export const toggleFavorito = (id: string) => useRelmeg.getState().toggleFavorito(id);
export const adicionarAnexo = (anexo: Omit<Anexo, "id" | "data">) =>
  useRelmeg.getState().adicionarAnexo(anexo);
export const removerAnexo = (id: string) => useRelmeg.getState().removerAnexo(id);
export function rotuloCliente(key: string): string {
  const cliente = useRelmeg.getState().clientes.find((c) => c.key === key);
  return cliente?.label ?? key;
}
