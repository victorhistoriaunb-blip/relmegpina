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
import { setoresDe, temasContrariosDe, temasInteresseDe, type Parlamentar } from "@/lib/relmeg/types";

export const Route = createFileRoute("/dashboards")({
  head: () => ({
    meta: [
      { title: "Dashboards Analíticos — RelMeg" },
      {
        name: "description",
        content:
          "Distribuição de parlamentares por UF, partido, cargo, setor, temas de interesse e temas contrários.",
      },
      { property: "og:title", content: "Dashboards Analíticos — RelMeg" },
      { property: "og:description", content: "Visualize sua base parlamentar em indicadores e gráficos dinâmicos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
];

const VERDE = "oklch(0.76 0.15 155)";
const VERMELHO = "oklch(0.7 0.17 20)";

function contar(values: string[], limite = 0) {
  const counts = new Map<string, number>();
  values.map((v) => v.trim()).filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const list = [...counts.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  return limite ? list.slice(0, limite) : list;
}

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
      <h1 className="font-display text-2xl font-semibold">{textos.dashboardsTitulo}</h1>
      <p className="text-sm text-muted-foreground">{textos.dashboardsSubtitulo}</p>
    </div>
  );

  if (data.length === 0) {
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

  const graficos: Record<string, (c: { titulo: string; descricao: string; limite?: number }) => React.ReactElement> = {
    interesse: (c) => (
      <Painel key="interesse" titulo={c.titulo} descricao={c.descricao} altura={360}>
        <BarChart data={contar(filtrados.flatMap(temasInteresseDe), c.limite)} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke={GRADE} />
          <XAxis type="number" stroke={EIXO} tick={tick} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={150} stroke={EIXO} tick={tick} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: REALCE, opacity: 0.3 }} />
          <Bar dataKey="total" fill={VERDE} radius={[0, 4, 4, 0]} />
        </BarChart>
      </Painel>
    ),
    contrario: (c) => (
      <Painel key="contrario" titulo={c.titulo} descricao={c.descricao} altura={360}>
        <BarChart data={contar(filtrados.flatMap(temasContrariosDe), c.limite)} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke={GRADE} />
          <XAxis type="number" stroke={EIXO} tick={tick} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={150} stroke={EIXO} tick={tick} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: REALCE, opacity: 0.3 }} />
          <Bar dataKey="total" fill={VERMELHO} radius={[0, 4, 4, 0]} />
        </BarChart>
      </Painel>
    ),
    uf: (c) => (
      <Painel key="uf" titulo={c.titulo} descricao={c.descricao} altura={360}>
        <BarChart data={contar(filtrados.map((p) => p.uf), c.limite)} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke={GRADE} />
          <XAxis type="number" stroke={EIXO} tick={tick} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={48} stroke={EIXO} tick={tick} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: REALCE, opacity: 0.3 }} />
          <Bar dataKey="total" fill={CORES[0]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </Painel>
    ),
    partido: (c) => {
      const dados = contar(filtrados.map((p) => p.partido), c.limite);
      return (
        <Painel key="partido" titulo={c.titulo} descricao={c.descricao} altura={360}>
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
    },
    cargo: (c) => (
      <Painel key="cargo" titulo={c.titulo} descricao={c.descricao}>
        <BarChart data={contar(filtrados.map((p) => p.cargo), c.limite)}>
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis dataKey="name" stroke={EIXO} tick={tick} />
          <YAxis stroke={EIXO} tick={tick} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: REALCE, opacity: 0.3 }} />
          <Bar dataKey="total" fill={CORES[1]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </Painel>
    ),
    setor: (c) => (
      <Painel key="setor" titulo={c.titulo} descricao={c.descricao}>
        <BarChart data={contar(filtrados.flatMap(setoresDe), c.limite)} margin={{ bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis
            dataKey="name"
            stroke={EIXO}
            tick={{ fill: EIXO, fontSize: 11 }}
            interval={0}
            angle={-20}
            height={64}
            textAnchor="end"
          />
          <YAxis stroke={EIXO} tick={tick} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: REALCE, opacity: 0.3 }} />
          <Bar dataKey="total" fill={CORES[2]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </Painel>
    ),
  };

  const visiveis = prefs.paineis.filter((c) => c.visivel && graficos[c.key]);

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
        <div className="grid gap-4 xl:grid-cols-2">{visiveis.map((c) => graficos[c.key]!(c))}</div>
      )}
    </div>
  );
}
