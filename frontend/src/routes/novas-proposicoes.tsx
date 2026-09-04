import { createFileRoute } from "@tanstack/react-router";
import { NovasProposicoesView } from "@/components/relmeg/NovasProposicoesView";

export const Route = createFileRoute("/novas-proposicoes")({
  head: () => ({
    meta: [
      { title: "Novas Proposições — RelMeg" },
      {
        name: "description",
        content:
          "Projetos recém-apresentados na Câmara e no Senado, organizados por cliente e tema, com exportação de clipping para WhatsApp.",
      },
      { property: "og:title", content: "Novas Proposições — RelMeg" },
      {
        property: "og:description",
        content: "Monitore os projetos recém-apresentados do seu recorte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NovasProposicoesView,
});