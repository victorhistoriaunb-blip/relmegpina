import { GenericDataView } from "./GenericDataView";
import { useRelmeg } from "@/lib/relmeg/store";

export function CamaraView() {
  const { data } = useRelmeg();
  const dadosCamara = data.filter((item) => item.categoria === "camara");

  return (
    <GenericDataView
      titulo="Câmara dos Deputados"
      subtitulo="Proposições e matérias cadastradas na plataforma."
      data={dadosCamara}
      columns={[
        { key: "siglaTipo", label: "Tipo" },
        { key: "numero", label: "Número" },
        { key: "ano", label: "Ano" },
        { key: "ementa", label: "Ementa" },
        { key: "autor", label: "Autor" },
      ]}
    />
  );
}