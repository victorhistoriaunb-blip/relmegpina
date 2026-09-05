import { useMemo, useState } from "react";
import { GenericDataView } from "./GenericDataView";
import { useRelmeg } from "@/lib/relmeg/store";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { titularLimpo } from "./AutorBadge";
import { getCamaraResumo } from "@/lib/relmeg/apiService";

export function CamaraView() {
  const { data, addItem } = useRelmeg();
  const [recarregando, setRecarregando] = useState(false);
  const dadosCamara = data.filter((item) => item.categoria === "camara");
  const perfis = useMemo(() => data.filter((item) => item.nome), [data]);
  const perfisMap = useMemo(() => new Map(perfis.map((p) => [titularLimpo(p.nome), p])), [perfis]);

  const atualizarBase = async () => {
    setRecarregando(true);
    try {
      const resposta = (await getCamaraResumo()) as any;
      const proposicoes = resposta?.proposicoes ?? [];
      if (proposicoes.length === 0) {
        toast.info("Nenhuma proposição retornada pela API da Câmara.");
        return;
      }
      const itens = proposicoes.map((p: any) => ({
        id: String(p.id),
        categoria: "camara",
        origemCategoria: "camara",
        siglaTipo: p.siglaTipo,
        numero: String(p.numero ?? ""),
        ano: String(p.ano ?? ""),
        ementa: String(p.ementa ?? ""),
        situacao: p.situacao,
        comissao: p.comissao,
        relator: p.relator,
      }));
      useRelmeg.getState().substituirCategoria("camara", itens);
      toast.success(`${proposicoes.length} proposições atualizadas da Câmara.`);
    } catch {
      toast.error("Não foi possível atualizar a base da Câmara.");
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
      const titulo = [item.siglaTipo, item.numero].filter(Boolean).join(" ");
      addItem({
        ...item,
        origemCategoria: "camara",
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
      titulo="Câmara dos Deputados"
      subtitulo="Proposições e matérias cadastradas na plataforma."
      data={dadosCamara}
      loading={recarregando}
      onRefresh={atualizarBase}
      autoCarregarVazio
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
          render: (item) => (
            <AutorComAlerta autor={item.autor} perfisMap={perfisMap} />
          ),
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

export function AutorComAlerta({
  autor,
  perfisMap,
}: {
  autor?: string;
  perfisMap: Map<string, any>;
}) {
  const nomeLimpo = titularLimpo(autor);
  const naBase = nomeLimpo && perfisMap.has(nomeLimpo);
  if (!naBase) {
    return (
      <span className="whitespace-normal break-words text-sm text-foreground/90">
        {String(autor ?? "") || "—"}
      </span>
    );
  }
  const perfil = perfisMap.get(nomeLimpo);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span title="Este autor está na sua base de perfis">🔥</span>
      <span className="whitespace-normal break-words text-sm text-foreground/90">
        {String(autor ?? "")}
      </span>
      <Badge
        variant="secondary"
        className="border-success/40 bg-success/15 text-success"
      >
        {perfil?.categoria === "monitoramento" ? "Monitorado" : "Base"}
      </Badge>
    </div>
  );
}

export function AndamentoComissao({ item }: { item: any }) {
  const comissao = String(item.comissao ?? "").trim();
  const situacao = String(item.situacao ?? "").trim();
  if (!comissao && !situacao) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {comissao && (
        <Badge variant="outline" className="whitespace-nowrap font-medium">
          {comissao}
        </Badge>
      )}
      {situacao && (
        <span className="whitespace-normal break-words text-xs text-muted-foreground">
          {situacao}
        </span>
      )}
    </div>
  );
}