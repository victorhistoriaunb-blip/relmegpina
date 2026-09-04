import { Users, ThumbsUp, ThumbsDown, MapPin } from "lucide-react";
import type { Parlamentar } from "@/lib/relmeg/types";
import { temasContrariosDe, temasInteresseDe } from "@/lib/relmeg/types";
import { useRelmeg } from "@/lib/relmeg/store";

function topOf(values: string[]) {
  const counts = new Map<string, number>();
  values.map((v) => v.trim()).filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
}

const ICONES = { total: Users, apoio: ThumbsUp, resistencia: ThumbsDown, uf: MapPin } as const;

export function KpiCards({ data }: { data: Parlamentar[] }) {
  const { prefs } = useRelmeg();
  const apoio = topOf(data.flatMap(temasInteresseDe));
  const resistencia = topOf(data.flatMap(temasContrariosDe));
  const uf = topOf(data.map((p) => p.uf));

  const valores: Record<string, { value: string; contagem?: number | undefined }> = {
    total: { value: String(data.length) },
    apoio: { value: apoio?.[0] ?? "—", contagem: apoio?.[1] },
    resistencia: { value: resistencia?.[0] ?? "—", contagem: resistencia?.[1] },
    uf: { value: uf?.[0] ?? "—", contagem: uf?.[1] },
  };

  const cards = prefs.kpis.filter((c) => c.visivel);
  if (cards.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => {
        const Icone = ICONES[card.key as keyof typeof ICONES] ?? Users;
        const info = valores[card.key] ?? { value: "—" };
        const hint =
          card.key === "total"
            ? card.descricao
            : info.contagem
              ? `${info.contagem} ${card.descricao}`
              : "—";
        return (
          <div
            key={card.key}
            className="panel panel-hover rise-in rounded-xl p-4 transition-transform duration-300 hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{card.titulo}</p>
              <Icone className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="mt-3 truncate font-display text-2xl font-semibold" title={info.value}>
              {info.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        );
      })}
    </div>
  );
}
