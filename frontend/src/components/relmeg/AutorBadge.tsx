import { nomeSemPrefixos } from "@/lib/relmeg/cruzamento";

export function titularLimpo(autor?: string): string {
  return nomeSemPrefixos(autor) || "";
}