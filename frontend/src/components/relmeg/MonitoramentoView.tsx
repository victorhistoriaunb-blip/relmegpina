import { GenericDataView } from "./GenericDataView";
import { ClienteSelector } from "./ClienteSelector";
import { useRelmeg } from "@/lib/relmeg/store";
import { exportarClippingParaWhatsApp } from "@/lib/relmeg/clipping";
import { Badge } from "@/components/ui/badge";
import { tituloProposicao, casaDe } from "@/lib/relmeg/clipping";
import { filtrarPorCliente } from "@/lib/relmeg/clientes";

const ROTULO_CASA: Record<string, string> = {
  camara: "Câmara",
  senado: "Senado",
  dou: "DOU",
  outros: "Outros",
};

export function MonitoramentoView() {
  const { data, clienteAtivo } = useRelmeg();
  const dadosMon = filtrarPorCliente(
    data.filter((item) => item.categoria === "monitoramento"),
    clienteAtivo,
  );

  return (
    <GenericDataView
      titulo="Central de Monitoramento"
      subtitulo="Tracking em tempo real de proposições, matérias e candidaturas no recorte do cliente ativo."
      data={dadosMon}
      selecionavel
      visaoPadraoCards
      extraAcoes={<ClienteSelector />}
      onExportarClipping={(itens) => void exportarClippingParaWhatsApp(itens)}
      columns={[
        {
          key: "titulo",
          label: "Item Monitorado",
          render: (item) => (
            <div className="max-w-2xl space-y-0.5">
              <span className="font-medium text-foreground">{tituloProposicao(item)}</span>
              {(item.ementa || item.ementa1 || item.descricao) && (
                <p className="line-clamp-2 whitespace-normal break-words text-xs text-muted-foreground">
                  {String(item.ementa || item.ementa1 || item.descricao)}
                </p>
              )}
            </div>
          ),
        },
        {
          key: "origem",
          label: "Origem",
          render: (item) => (
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {ROTULO_CASA[casaDe(item)] ?? "Outros"}
            </Badge>
          ),
        },
        { key: "status", label: "Status" },
        { key: "atualizacao", label: "Última Atualização" },
      ]}
    />
  );
}