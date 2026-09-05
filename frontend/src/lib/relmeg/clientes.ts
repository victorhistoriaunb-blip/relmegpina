import type { ClienteDef } from "./types";

/** Gera a chave (slug) a partir de um nome de cliente/projeto. */
export function slugDe(texto: string): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Palavras-chave de monitoramento de um cliente (sem duplicatas). */
export function palavrasChaveDe(cliente: ClienteDef | undefined): string[] {
  if (!cliente) return [];
  const fonte = [
    ...(cliente.palavrasChave ?? []),
    ...(cliente.temas ?? []),
    cliente.setor ?? "",
    cliente.label ?? "",
  ];
  const limpas = fonte.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return [...new Set(limpas)];
}

/**
 * Retorna os itens estritamente do cliente ativo.
 * Com "todos", devolve a lista completa.
 */
export function filtrarPorCliente<E>(items: E[], clienteAtivo: string): E[] {
  if (!clienteAtivo || clienteAtivo === "todos") return items;
  return items.filter(
    (item) => (item as { cliente?: string })?.cliente === clienteAtivo,
  );
}

/**
 * Tenta adivinhar o cliente de uma ementa/texto com base nas palavras-chave.
 * Retorna a chave do primeiro cliente que casar, ou null se nenhum casar.
 */
export function clienteDeEmenta(
  texto: string,
  clientes: ClienteDef[],
): string | null {
  const alvo = (texto || "").toLowerCase();
  if (!alvo) return null;
  for (const cliente of clientes) {
    const termos = palavrasChaveDe(cliente);
    if (termos.some((termo) => alvo.includes(termo.toLowerCase()))) {
      return cliente.key;
    }
  }
  return null;
}

/**
 * Monta a string de busca usada nas APIs quando um cliente está ativo:
 * palavras-chave do cliente + termo manual opcional.
 */
export function termosDeMonitoramento(
  clienteAtivo: string,
  clientes: ClienteDef[],
  termoManual = "",
): string {
  const cliente = clientes.find((c) => c.key === clienteAtivo);
  const palavras = clienteAtivo !== "todos" ? palavrasChaveDe(cliente) : [];
  return [termoManual.trim(), ...palavras].filter(Boolean).join(" ");
}