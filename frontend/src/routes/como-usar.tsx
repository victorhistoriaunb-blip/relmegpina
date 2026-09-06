import { createFileRoute } from "@tanstack/react-router";
import { ComoUsarView } from "@/components/relmeg/ComoUsarView";

export const Route = createFileRoute("/como-usar")({
  head: () => ({
    meta: [
      { title: "Como Usar — RelMeg" },
      {
        name: "description",
        content:
          "Manual exaustivo do RelMeg: cadastro de clientes, varreduras de proposições, TSE, DOU, monitoramento e exportações.",
      },
      { property: "og:title", content: "Como Usar — RelMeg" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ComoUsarView,
});