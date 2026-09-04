import { useMemo, useState } from "react";
import { GenericDataView } from "./GenericDataView";
import { useRelmeg } from "@/lib/relmeg/store";
import { toast } from "sonner";
import { AutorComAlerta, AndamentoComissao } from "./CamaraView";
import { titularLimpo } from "./AutorBadge";
import { getSenadoResumo } from "@/lib/relmeg/apiService";

export function SenadoView() {
  const { data, addItem } = useRelmeg();
  const [recarregando, setRecarregando] = useState(false);
  const dadosSenado = data.filter((item) => item.categoria === "senado");
  const perfis = useMemo(() => data.filter((item) => item.nome), [data]);
  const perfisMap = useMemo(() => new Map(perfis.map((p) => [titularLimpo(p.nome), p])), [perfis]);

  const atualizarBase = async () => {
    setRecarregando(true);
    try {
      const resposta = (await getSenadoResumo()) as any;
      const materias = resposta?.materias ?? [];
      if (materias.length === 0) {
        toast.info("Nenhuma matéria retornada pela API do Senado.");
        return;
      }
      const itens = materias.map((m: any) => ({
        id: String(m.codigo ?? m.identificacaoProcesso ?? ""),
        categoria: "senado",
        origemCategoria: "senado",
        sigla: m.sigla,
        numero: String(m.numero ?? ""),
        ano: String(m.ano ?? ""),
        ementa: String(m.ementa ?? ""),
        autor: String(m.autor ?? ""),
        url: m.url,
        situacao: m.situacao,
        comissao: m.comissao,
        relator: m.relator,
      }));
      useRelmeg.getState().substituirCategoria("senado", itens);
      toast.success(`${materias.length} matérias atualizadas do Senado.`);
    } catch {
      toast.error("Não foi possível atualizar a base do Senado.");
    } finally {
      setRecarregando(false);
    }
  };

  const adicionarAoMonitoramento = (itens: any[]) => {
    const monitorados = new Set(
      data.filter((item) => item.categoria === "monitoramento").map((item) => item.id),
    );
    let adicionados = 0;
    for (const item of itens) {
      if (monitorados.has(item.id)) continue;
      const titulo = [item.sigla, item.numero].filter(Boolean).join(" ");
      addItem({
        ...item,
        origemCategoria: "senado",
        categoria: "monitoramento",
        titulo: item.ano ? `${titulo}/${item.ano}` : titulo,
        status: "Em monitoramento",
        atualizacao: new Date().toLocaleDateString("pt-BR"),
      });
      monitorados.add(item.id);
      adicionados++;
    }
    if (adicionados > 0) {
      toast.success(
        `${adicionados} ${adicionados === 1 ? "matéria adicionada" : "matérias adicionadas"} ao Monitoramento`,
      );
    } else {
      toast.info("Os itens selecionados já estão no Monitoramento");
    }
  };

  return (
    <GenericDataView
      titulo="Senado Federal"
      subtitulo="Matérias e propostas em tramitação no Senado."
      data={dadosSenado}
      loading={recarregando}
      onRefresh={atualizarBase}
      selecionavel
      onAdicionarAoMonitoramento={adicionarAoMonitoramento}
      columns={[
        {
          key: "ementa",
          label: "Ementa",
          render: (item) => (
            <div className="max-w-2xl whitespace-normal break-words text-foreground/90 line-clamp-3 leading-snug">
              {String(item.ementa ?? "") || "—"}
            </div>
          ),
        },
        {
          key: "autor",
          label: "Autor",
          render: (item) => <AutorComAlerta autor={item.autor} perfisMap={perfisMap} />,
        },
        {
          key: "comissao",
          label: "Comissão / Situação",
          render: (item) => <AndamentoComissao item={item} />,
        },
        {
          key: "relator",
          label: "Relator",
          render: (item) => (
            <span className="whitespace-normal break-words text-sm text-foreground/80">
              {String(item.relator ?? "") || "—"}
            </span>
          ),
        },
      ]}
    />
  );
}