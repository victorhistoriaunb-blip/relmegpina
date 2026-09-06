import {
  LayoutGrid,
  UserRound,
  Sparkles,
  Vote,
  Newspaper,
  Radar,
  BarChart3,
  FileDown,
  Wrench,
  Workflow,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

function Secao({
  id,
  titulo,
  icone,
  children,
}: {
  id: string;
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-secondary/40 text-primary">
          {icone}
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground">{titulo}</h2>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Passo({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function Codigo({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-[12px]">{children}</code>;
}

export function ComoUsarView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Como Usar — Manual do RelMeg
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentação exaustiva do sistema e do pipeline de dados: cadastro de clientes, varreduras,
          dashboards e exportações.
        </p>
      </div>

      <nav className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nesta página
        </p>
        <ul className="grid gap-x-6 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
          <li><a className="transition-colors hover:text-primary hover:underline" href="#pipeline">1. Visão geral do pipeline</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#comecar">2. Começando em 10 minutos</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#clientes">3. Clientes e projetos</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#perfis">4. Perfis (Câmara e Senado)</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#proposicoes">5. Novas Proposições</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#tse">6. TSE — Eleições</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#dou">7. Diário Oficial (DOU)</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#monitoramento">8. Monitoramento</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#exportar">9. Exportação, clipping e nuvem</a></li>
          <li><a className="transition-colors hover:text-primary hover:underline" href="#solucao">10. Resolução de problemas</a></li>
        </ul>
      </nav>

      <Secao id="pipeline" titulo="1. Visão geral do pipeline" icone={<Workflow className="h-4 w-4" />}>
        <p>
          O RelMeg é uma plataforma de inteligência legislativa que busca, organiza e filtra dados
          públicos em tempo real:
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            <strong>Fontes oficiais</strong> — APIs abertas da Câmara (<Codigo>dadosabertos.camara</Codigo>),
            do Senado (<Codigo>legis.senado</Codigo>), do TSE (DivulgaCandContas) e da Imprensa
            Nacional (DOU).
          </li>
          <li>
            <strong>Back-end</strong> — o serviço em FastAPI consulta as fontes, enriquece os dados
            (situação, comissão, relator, patrimônio) e aplica rate limit para não sobrecarregar as
            APIs oficiais.
          </li>
          <li>
            <strong>Tela</strong> — cada aba transforma o resultado em tabelas, cards executivos,
            dossiês e drawers com cópia, sempre recortados pelo cliente ativo.
          </li>
          <li>
            <strong>Saída</strong> — exportação em <Codigo>CSV</Codigo>, planilha <Codigo>XLSX</Codigo>,
            clipping para WhatsApp, anotações e sincronização bidirecional com a nuvem (Supabase).
          </li>
        </ol>
        <p>
          O cliente ativo (barra superior ou seletor em cada aba) define o recorte: se um cliente é
          selecionado, as varreduras priorizam as suas palavras-chave e apenas os registros vinculados
          a ele aparecem.
        </p>
      </Secao>

      <Secao id="comecar" titulo="2. Começando em 10 minutos" icone={<BookOpen className="h-4 w-4" />}>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Acesse <strong>Admin → Clientes / Projetos (CRUD)</strong> e crie o primeiro cliente com
            nome, setor e palavras-chave (ex.: <Codigo>energia elétrica</Codigo>, <Codigo>ANEEL</Codigo>,{" "}
            <Codigo>mineração</Codigo>).
          </li>
          <li>
            Ative o cliente no seletor global da barra superior ou dentro de qualquer aba.
          </li>
          <li>
            Abra <strong>Novas Proposições</strong> e clique em <em>Atualizar base</em> para puxar
            projetos da Câmara (verde) e do Senado (azul) conforme o perfil.
          </li>
          <li>
            Entre em <strong>DOU</strong>, escolha um dia no calendário (opcional) e clique em{" "}
            <em>Buscar no DOU</em>.
          </li>
          <li>
            Abra <strong>TSE — Eleições</strong> e filtre por ano, UF, cargo, partido, município e
            situação.
          </li>
          <li>
            Acompanhe tudo em <strong>Monitoramento</strong>, usando os cards para anotar, favoritar
            e exportar clippings.
          </li>
        </ol>
        <p>
          Dica: a base começa vazia de propósito. Cada aba carrega automaticamente a primeira consulta
          assim que entra nela (ou após clique no botão de atualizar).
        </p>
      </Secao>

      <Secao id="clientes" titulo="3. Clientes e projetos" icone={<UserRound className="h-4 w-4" />}>
        <p>
          O RelMeg parte de um sistema em branco: <strong>não há clientes de exemplo</strong>. Todo o
          recorte é criado por você. Há duas formas de cadastrar:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Admin → Clientes / Projetos (CRUD)</strong> — gestão completa com edição,
            exclusão, ativação e sincronização com a nuvem.
          </li>
          <li>
            <strong>Novas Proposições → Novo cliente</strong> — cadastro rápido na própria seção, já
            ativando o cliente para a varredura.
          </li>
        </ul>
        <p>Campos do cadastro:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Nome</strong> — gera a chave única (slug) usada para vincular registros.
          </li>
          <li>
            <strong>Setor</strong> — segmento de atuação (opcional, entra nas palavras de busca).
          </li>
          <li>
            <strong>Palavras-chave</strong> — termos usados no monitoramento automático da Câmara,
            do Senado e do DOU; separe por vírgula ou linha.
          </li>
          <li>
            <strong>Temas</strong> — rótulos de recorte exibidos nos cards (opcional).
          </li>
        </ul>
        <p>
          O botão <strong>Interesses do cliente</strong> (em Novas Proposições) abre o mesmo editor
          para o cliente ativo. Quanto mais precisas as palavras-chave, mais estrito será o recorte.
        </p>
      </Secao>

      <Secao id="perfis" titulo="4. Perfis (Câmara e Senado)" icone={<LayoutGrid className="h-4 w-4" />}>
        <p>
          As abas <strong>Perfis</strong>, <strong>Câmara</strong> e <strong>Senado</strong> mostram
          parlamentares e proposições com tabelas e <em>cards executivos</em>. Em cada card você pode:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>favoritar o registro (estrela amarela) e vê-lo em todo o sistema;</li>
          <li>anexar nota interna (ícone de nota);</li>
          <li>abrir o detalhe com um clique;</li>
          <li>abrir a fonte oficial clicando no link da proposição (ficha na Câmara ou matéria no Senado).</li>
        </ul>
        <p>
          A busca global do topo pesquisa em todos os campos da página visível. Os filtros avançados
          restringem por coluna. Use o botão <em>Atualizar base</em> para puxar o resultado mais
          recente das APIs.
        </p>
      </Secao>

      <Secao id="proposicoes" titulo="5. Novas Proposições" icone={<Sparkles className="h-4 w-4" />}>
        <p>
          Concentra os projetos recém-apresentados com <strong>cores estritas por casa</strong>: verde
          = Câmara dos Deputados e azul = Senado Federal.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Cliente / Tema da varredura</strong> — a busca usa as palavras-chave do cliente
            ativo (ou todas quando em <Codigo>todos</Codigo>).
          </li>
          <li>
            <strong>Termo extra</strong> — soma termos manuais à consulta das APIs.
          </li>
          <li>
            <strong>Atualizar base</strong> — puxa proposições da Câmara e do Senado e atribui cada
            registro ao cliente cujas palavras-chave casarem com a ementa.
          </li>
          <li>
            <strong>Drawer lateral</strong> — clique em qualquer cartão para abrir o painel com a
            ementa completa, dados de autoria, comissão/relator e as opções de{" "}
            <em>copiar título</em>, <em>copiar ementa</em>, <em>copiar clipping</em> (formato WhatsApp
            com o link oficial) e <em>copiar link</em>. Há ainda o botão <em>Adicionar ao
            Monitoramento</em>.
          </li>
          <li>
            <strong>Seleção</strong> — marque cartões (checkbox) e use “Selecionar resultados” ou{" "}
            <em>Exportar Clipping</em> para enviar ao WhatsApp.
          </li>
        </ul>
        <p>
          Todo link aponta para a <strong>ficha oficial</strong> da proposição (portal da Câmara ou
          matéria do Senado) — não para JSON de API.
        </p>
      </Secao>

      <Secao id="tse" titulo="6. TSE — Eleições" icone={<Vote className="h-4 w-4" />}>
        <p>
          Consulta direta ao DivulgaCandContas do TSE, com filtros geográficos e políticos:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Filtros principais</strong> — ano eleitoral (2024, 2022 ou 2020), UF, município,
            cargo, partido (ou federação/coligação), situação da candidatura e termo por nome, CPF,
            CNPJ ou número de urna.
          </li>
          <li>
            <strong>Dossiê patrimonial</strong> — clique na linha em “tabela” ou no card para abrir a
            ficha com dados pessoais (nascimento, gênero, raça/cor, estado civil), coligação e a
            declaração completa de bens (patrimônio total e itens), além do botão{" "}
            <em>Adicionar ao Monitoramento</em>.
          </li>
          <li>
            <strong>Favoritos e exportação</strong> — estrela para favoritar, e CSV/XLSX da listagem
            atual.
          </li>
        </ul>
        <p>
          Escopo: ano, UF, município, cargo, partido, status e termo atuam na listagem; gênero,
          raça/cor e patrimônio ficam no dossiê. Detalhes consolidados de contas estão no portal do
          TSE (link na própria aba).
        </p>
      </Secao>

      <Secao id="dou" titulo="7. Diário Oficial (DOU)" icone={<Newspaper className="h-4 w-4" />}>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Filtros rápidos</strong> — atalhos prontos (setor elétrico, mercado de capitais,
            delivery) que preenchem o termo de busca.
          </li>
          <li>
            <strong>Termo</strong> — digite a palavra de busca; ao estar com um cliente ativo, as
            palavras-chave dele são cruzadas automaticamente.
          </li>
          <li>
            <strong>Calendário “Dia exato”</strong> — abra o pop-up ao lado do termo, escolha o dia e
            a busca passa a considerar somente publicações daquela data (formato AAAA-MM-DD enviado ao
            endpoint). Para voltar a buscar “recentes”, limpe o dia.
          </li>
          <li>
            <strong>Resumo Mágico (IA)</strong> — dentro do drawer da publicação, o botão gera um
            resumo prático do ato com IA.
          </li>
        </ul>
        <p>
          As publicações carregadas ficam na tabela/cards da aba e podem ser filtradas, exportadas e
          abertas no site do DOU (link oficial).
        </p>
      </Secao>

      <Secao id="monitoramento" titulo="8. Monitoramento" icone={<Radar className="h-4 w-4" />}>
        <p>
          Central de acompanhamento dos registros salvos (proposições, matérias, candidatos) por meio
          do botão <em>Adicionar ao Monitoramento</em> das outras abas. Aqui você pode:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>ver o status “Em monitoramento” e a data de atualização;</li>
          <li>anotar internamente cada registro (cards executivos);</li>
          <li>favoritar os prioritários;</li>
          <li>selecionar e exportar clipping para WhatsApp em grupo;</li>
          <li>abrir a fonte oficial direto no card.</li>
        </ul>
      </Secao>

      <Secao id="exportar" titulo="9. Exportação, clipping e nuvem" icone={<FileDown className="h-4 w-4" />}>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>CSV / XLSX</strong> — disponível em todas as listagens (proposições, DOU, TSE)
            para análise em planilha ou upload no Looker Studio.
          </li>
          <li>
            <strong>Clipping WhatsApp</strong> — selecione os itens e exporte o texto formatado
            (negrito para títulos, link oficial entre parênteses, autor e data) direto na área de
            transferência.
          </li>
          <li>
            <strong>Nuvem (Supabase)</strong> — o CRUD de clientes sincroniza automaticamente com a
            nuvem quando há sessão. O ícone mostra se está <em>Sincronizado com a nuvem</em> ou{" "}
            <em>Somente local</em>; o botão <em>Sincronizar</em> força a reconciliação. Salvar no
            monitoramento também tenta gravar os registros na nuvem.
          </li>
        </ul>
      </Secao>

      <Secao id="solucao" titulo="10. Resolução de problemas" icone={<Wrench className="h-4 w-4" />}>
        <ul className="space-y-3">
          <li>
            <Badge variant="outline" className="mr-2 align-middle">TSE</Badge>
            <strong>“O TSE bloqueou a consulta automática (403)”</strong> — a API aberta do
            DivulgaCandContas pode bloquear requisições de alguns provedores/redes. Aguarde e tente
            novamente, ou consulte o portal do TSE (link na aba). Se o backend permitir, a base da API
            pode ser sobreposta pela variável de ambiente <Codigo>TSE_BASE_URL</Codigo>.
          </li>
          <li>
            <Badge variant="outline" className="mr-2 align-middle">DOU</Badge>
            <strong>Nenhuma publicação encontrada</strong> — sem data, a busca retorna as republicações
            recentes; escolha um dia no calendário ou simplifique o termo (mínimo 3 caracteres).
          </li>
          <li>
            <Badge variant="outline" className="mr-2 align-middle">Nuvem</Badge>
            <strong>“Somente local”</strong> — sem sessão no Supabase, os dados ficam no navegador.
            Faça login e clique em <em>Sincronizar</em> no Admin para enviar/baixar clientes.
          </li>
          <li>
            <Badge variant="outline" className="mr-2 align-middle">Busca</Badge>
            <strong>Recorte vazio em Novas Proposições</strong> — verifique o cliente ativo e as
            palavras-chave; quanto mais específicas, menor o número de correspondências. Use o termo
            extra para ampliar.
          </li>
        </ul>
      </Secao>

      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm text-foreground/90">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          As abas <strong>Dashboards</strong> e <strong>Central de Ajuda</strong> complementam este
          manual com a visão consolidada de KPIs e perguntas frequentes. Recarregue a base sempre que
          quiser dados atualizados das fontes oficiais.
        </p>
      </div>
    </div>
  );
}