import { GenericDataView } from "./GenericDataView";
import { useRelmeg } from "@/lib/relmeg/store";

export function SenadoView() {
  const { data } = useRelmeg();
  const dadosSenado = data.filter((item) => item.categoria === "senado");

  return (
    <GenericDataView
      titulo="Senado Federal"
      subtitulo="Matérias e propostas em tramitação no Senado."
      data={dadosSenado}
      columns={[
        { key: "sigla", label: "Sigla" },
        { key: "numero", label: "Número" },
        { key: "ementa", label: "Ementa" },
        { key: "autor", label: "Autor" },
      ]}
    />
  );
}