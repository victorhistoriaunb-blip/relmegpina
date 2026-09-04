const PREFIXOS = new Set([
  "a",
  "o",
  "as",
  "os",
  "im",
  "dep",
  "deps",
  "deputado",
  "deputada",
  "deputados",
  "deputadas",
  "sen",
  "sra",
  "sr",
  "senador",
  "senadora",
  "senadores",
  "senadoras",
  "vereador",
  "vereadora",
  "prefeito",
  "prefeita",
  "gov",
  "governador",
  "governadora",
  "dr",
  "dra",
  "doutor",
  "doutora",
  "prof",
  "professor",
  "professora",
  "exmo",
  "exma",
  "excelentíssimo",
  "excelentíssima",
]);

export function normalizarNome(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nomeSemPrefixos(autor: unknown): string {
  const tokens = normalizarNome(autor).split(" ");
  while (tokens.length > 1 && PREFIXOS.has(tokens[0]!)) tokens.shift();
  return tokens.join(" ");
}

export interface PerfilCorrespondente {
  item: Record<string, any>;
  mesmoNome: boolean;
}

/**
 * Cruza o nome do autor de uma proposição com os perfis salvos na base.
 * Retorna o perfil correspondente (ou null) usando nome exato, substrings
 * seguras e sobrenome final — para evitar falso-positivos em nomes curtos.
 */
export function autorCorrespondePerfil(
  autor: unknown,
  perfis: any[],
): PerfilCorrespondente | null {
  const alvo = nomeSemPrefixos(autor);
  if (!alvo) return null;

  const tokensAlvo = alvo.split(" ");
  const sobrenomeAlvo = tokensAlvo[tokensAlvo.length - 1] ?? "";

  for (const perfil of perfis) {
    const nomePerfil = nomeSemPrefixos(perfil?.nome);
    if (!nomePerfil) continue;

    if (nomePerfil === alvo) return { item: perfil, mesmoNome: true };

    const comprimentoOk = nomePerfil.length >= 6 && alvo.length >= 6;
    if (comprimentoOk && (nomePerfil.includes(alvo) || alvo.includes(nomePerfil))) {
      return { item: perfil, mesmoNome: false };
    }

    const tokensPerfil = nomePerfil.split(" ");
    const sobrenomePerfil = tokensPerfil[tokensPerfil.length - 1] ?? "";
    if (sobrenomeAlvo.length >= 5 && sobrenomeAlvo === sobrenomePerfil) {
      return { item: perfil, mesmoNome: false };
    }
  }

  return null;
}