import { GenericDataView } from "./GenericDataView";
import { useRelmeg } from "@/lib/relmeg/store";

export function MonitoramentoView() {
  const { data } = useRelmeg();
  const dadosMon = data.filter((item) => item.categoria === "monitoramento");

  return (
    <GenericDataView
      titulo="Central de Monitoramento"
      subtitulo="Tracking em tempo real de proposições e palavras-chave."
      data={dadosMon}
      columns={[
        { key: "titulo", label: "Item Monitorado" },
        { key: "status", label: "Status" },
        { key: "atualizacao", label: "Última Atualização" },
      ]}
    />
  );
}