import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/relmeg/KpiCards";
import { FichaDialog } from "@/components/relmeg/FichaDialog";
import { EmptyState } from "@/components/relmeg/EmptyState";
import { FilterBar, aplicarFiltros } from "@/components/relmeg/FilterBar";
import { useRelmeg } from "@/lib/relmeg/store";
import { type Parlamentar } from "@/lib/relmeg/types";

export const Route = createFileRoute("/dashboards")({
  head: () => ({
    meta: [
      { title: "Dashboards Analíticos — RelMeg" },
      { name: "description", content: "Dashboards dinâmicos e adaptáveis às colunas da sua planilha." },
    ],
  }),
  component: Dashboards,
});

const CORES = [
  "oklch(0.72 0.17 255)",
  "oklch(0.79 0.13 215)",
  "oklch(0.76 0.14 195)",
  "oklch(0.68 0.18 285)",
  "oklch(0.84 0.1 235)",
  "oklch(0.76 0.15 155)",
  "oklch(0.7 0.17 20)",
];

const EIXO = "oklch(0.86 0.02 258)";
const GRADE = "oklch(0.32 0.035 260)";
const REALCE = "oklch(0.42 0.055 258)";

const tooltipStyle = {
  backgroundColor: "oklch(0.21 0.038 264)",
  border: "1px solid oklch(0.42 0.05 262)",
  borderRadius: 8,
  color: "oklch(0.98 0.008 250)",
  fontSize: 12,
};

const tooltipLabelStyle = { color: "oklch(0.98 0.008 250)", fontWeight: 600 };
const tooltipItemStyle = { color: "oklch(0.93 0.012 250)" };
const tick = { fill: EIXO, fontSize: 12 };

function contarDadosDinamicos(data: Parlamentar[], colunaOrChave: string, limite = 0) {
  const counts = new Map<string, number>();
  if (!Array.isArray(data)) return [];
  
  data.forEach((item) => {
    if (!item) return;
    const valor = (item as Record<string, any>)[colunaOrChave] ?? item.partido;
    if (Array.isArray(valor)) {
      valor.forEach((v) => {
        if (v != null) {
          const limpo = String(v).trim();
          if (limpo) counts.set(limpo, (counts.get(limpo) ?? 0) + 1);
        }
      });
    } else if (valor != null) {
      const limpo = String(valor).trim();
      if (limpo) counts.set(limpo, (counts.get(limpo) ?? 0) + 1);
    }
  });

  const list = [...counts.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  return limite ? list.slice(0, limite) : list;
}

function Painel({
  titulo,
  descricao,
  altura = 300,
  children,
}: {
  titulo: string;
  descricao: string;
  altura?: number;
  children: React.ReactElement;
}) {
  return (
    <div className="panel panel-hover rise-in rounded-xl p-5">
      <h2 className="font-display text-base font-semibold">{titulo}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{descricao}</p>
      <ResponsiveContainer width="100%" height={altura}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function Dashboards() {
  const { data, filters, textos, prefs } = useRelmeg();
  const filtrados: Parlamentar[] = aplicarFiltros(data, filters);

  const Titulo = () => (
    <div>
      <h1 className="font-display text-2xl font-semibold">{textos?.["dashboardsTitulo"] || "Dashboards"}</h1>
      <p className="text-sm text-muted-foreground">{textos?.["dashboardsSubtitulo"] || "Análises geradas a partir da base."}</p>
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <Titulo />
        <EmptyState
          titulo="Sem dados para analisar"
          descricao="Os dashboards são gerados a partir da base importada. Envie uma planilha no painel Admin para visualizar os gráficos."
        />
      </div>
    );
  }

  const renderizarCardDinamico = (c: { key: string; titulo: string; descricao: string; limite?: number; tipo?: string; colunaOrigem?: string }) => {
    const campoAlvo = c.colunaOrigem || c.key;
    const dados = contarDadosDinamicos(filtrados, campoAlvo, c.limite);
    const tipoGrafico = c.tipo || "barra";

    if (tipoGrafico === "pizza") {
      return (
        <Painel key={c.key} titulo={c.titulo} descricao={c.descricao} altura={360}>
          <PieChart>
            <Pie data={dados} dataKey="total" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
              {dados.map((entry, i) => (
                <Cell key={entry.name} fill={CORES[i % CORES.length]} stroke="oklch(0.235 0.021 259)" />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 12, color: EIXO }} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
          </PieChart>
        </Painel>
      );
    }

    if (tipoGrafico === "ranking" || tipoGrafico === "barra") {
      return (
        <Painel key={c.key} titulo={c.titulo} descricao={c.descricao} altura={360}>
          <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke={GRADE} />
            <XAxis type="number" stroke={EIXO} tick={tick} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={140} stroke={EIXO} tick={tick} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: REALCE, opacity: 0.3 }} />
            <Bar dataKey="total" fill={CORES[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </Painel>
      );
    }

    return (
      <Painel key={c.key} titulo={c.titulo} descricao={c.descricao}>
        <BarChart data={dados}>
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis dataKey="name" stroke={EIXO} tick={tick} />
          <YAxis stroke={EIXO} tick={tick} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: REALCE, opacity: 0.3 }} />
          <Bar dataKey="total" fill={CORES[1]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </Painel>
    );
  };

  const visiveis = prefs?.paineis?.filter((c) => c.visivel) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Titulo />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/configuracoes">
              <SlidersHorizontal className="h-4 w-4" /> Editar cards
            </Link>
          </Button>
          <FichaDialog data={filtrados} filters={filters} />
        </div>
      </div>
      <KpiCards data={filtrados} />
      <FilterBar data={data} />

      {visiveis.length === 0 ? (
        <div className="panel rounded-xl p-10 text-center text-sm text-muted-foreground">
          Nenhum card visível. Ative os cards desejados em Configurações.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">{visiveis.map((c) => renderizarCardDinamico(c as any))}</div>
      )}
    </div>
  );
}
