import { GenericDataView } from "./GenericDataView";
import { useRelmeg } from "@/lib/relmeg/store";

export function DouView() {
  const { data } = useRelmeg();
  const dadosDou = data.filter((item) => item.categoria === "dou");

  return (
    <GenericDataView
      titulo="Diário Oficial da União (DOU)"
      subtitulo="Monitoramento de atos normativos e publicações oficiais."
      data={dadosDou}
      columns={[
        { key: "data", label: "Data" },
        { key: "secao", label: "Seção" },
        { key: "ementa", label: "Resumo / Ementa" },
      ]}
    />
  );
}