export type Textos = {
  perfisTitulo: string;
  perfisSubtitulo: string;
  dashboardsTitulo: string;
  dashboardsSubtitulo: string;
  ajudaIntro: string;
};

export const TEXTOS_PADRAO: Textos = {
  perfisTitulo: "Perfis",
  perfisSubtitulo: "Base parlamentar organizada para inteligência de Relações Governamentais.",
  dashboardsTitulo: "Dashboards",
  dashboardsSubtitulo: "Análises geradas automaticamente a partir da base importada.",
  ajudaIntro: "Guia rápido de operação do RelMeg.",
};

export const CAMPOS_TEXTO: { key: keyof Textos; label: string; multi?: boolean }[] = [
  { key: "perfisTitulo", label: "Título da página Perfis" },
  { key: "perfisSubtitulo", label: "Subtítulo da página Perfis", multi: true },
  { key: "dashboardsTitulo", label: "Título dos Dashboards" },
  { key: "dashboardsSubtitulo", label: "Subtítulo dos Dashboards", multi: true },
  { key: "ajudaIntro", label: "Introdução da Central de Ajuda", multi: true },
];
