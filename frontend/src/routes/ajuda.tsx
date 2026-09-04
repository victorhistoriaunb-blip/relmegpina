import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CAMPOS } from "@/lib/relmeg/types";
import { Badge } from "@/components/ui/badge";
import { useRelmeg } from "@/lib/relmeg/store";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Central de Ajuda — RelMeg" },
      {
        name: "description",
        content: "Como preparar a planilha, importar dados, usar filtros, interpretar gráficos e copiar briefings no RelMeg.",
      },
      { property: "og:title", content: "Central de Ajuda — RelMeg" },
      { property: "og:description", content: "Guia de uso do RelMeg para times de Relações Governamentais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ajuda,
});

const topicos = [
  {
    titulo: "Como preparar a planilha",
    conteudo:
      "Use a primeira linha como cabeçalho, com uma coluna por campo. A ordem das colunas não importa — o RelMeg reconhece os nomes automaticamente. Linhas sem o nome do parlamentar são ignoradas. Baixe o modelo no Admin para começar com a estrutura correta.",
  },
  {
    titulo: "Campos obrigatórios",
    conteudo:
      "Nome, Partido, UF, Cargo, Tema de Interesse 1, Tema de Interesse 2, Tema Contrário 1, Tema Contrário 2 e Setor 1. Sem essas colunas a importação fica bloqueada.",
  },
  {
    titulo: "Campos opcionais",
    conteudo:
      "Setor 2, Setor 3, Breve Descrição, Proposição 1, Proposição 2, Proposição 3 e Anotações Internas. Para cada proposição você pode informar também as colunas Ementa 1/2/3 e Link 1/2/3 — ou escrever tudo em uma célula no formato 'Número | Ementa | https://link'.",
  },
  {
    titulo: "Como os campos são consolidados",
    conteudo:
      "Tema de Interesse 1 e 2 formam 'Temas de Interesse'; Tema Contrário 1 e 2 formam 'Temas Contrários'; Setor 1, 2 e 3 formam 'Setores'. Essas consolidações alimentam a busca, os filtros, os cards e todos os gráficos.",
  },
  {
    titulo: "Como importar dados",
    conteudo:
      "Acesse Admin, envie o arquivo .xlsx ou .csv, confira a conferência de colunas e a amostra dos registros e confirme a importação. Os dados ficam salvos no seu navegador (LocalStorage) e substituem a base anterior.",
  },
  {
    titulo: "Como utilizar filtros",
    conteudo:
      "Em Perfis e nos Dashboards, combine a busca livre com os filtros de Partido, UF, Cargo, Setor, Tema de Interesse e Tema Contrário. Os filtros são cumulativos e compartilhados entre as páginas. Use 'Limpar Filtros' para reiniciar a seleção.",
  },
  {
    titulo: "Como interpretar gráficos e cards",
    conteudo:
      "Os cards mostram o total de parlamentares, o tema com maior apoio, o tema com maior resistência e a UF com maior representação — sempre recalculados sobre o recorte filtrado. Os gráficos detalham temas, UF, partido, cargo e setor.",
  },
  {
    titulo: "Como copiar briefings",
    conteudo:
      "Clique em um parlamentar para abrir o perfil lateral e use 'Copiar Briefing'. O texto sai organizado com identificação, temas de interesse, temas contrários, setores, descrição, proposições (número, ementa e link) e anotações internas.",
  },
  {
    titulo: "Editar textos da plataforma",
    conteudo:
      "No Admin, a seção 'Textos da plataforma' permite alterar títulos e descrições das páginas de Perfis, Dashboards e Central de Ajuda. Use 'Restaurar padrão' para voltar aos textos originais.",
  },
];

function Ajuda() {
  const { textos } = useRelmeg();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Central de Ajuda</h1>
        <p className="text-sm text-muted-foreground">{textos["ajudaIntro"]}</p>
      </div>

      <div className="panel panel-hover rise-in rounded-xl p-5">
        <h2 className="text-sm font-semibold">Colunas reconhecidas</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CAMPOS.map((c) => (
            <Badge
              key={c.key}
              variant={c.obrigatorio ? "outline" : "secondary"}
              className={c.obrigatorio ? "border-primary/40 font-normal text-primary" : "font-normal"}
            >
              {c.label}
              {c.obrigatorio ? " *" : ""}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">* Campos obrigatórios.</p>
      </div>

      <div className="panel panel-hover rounded-xl px-5">
        <Accordion type="single" collapsible defaultValue="0">
          {topicos.map((t, i) => (
            <AccordionItem key={t.titulo} value={String(i)}>
              <AccordionTrigger className="text-left">{t.titulo}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{t.conteudo}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
