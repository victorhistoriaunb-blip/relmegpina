# RelMeg

Sou um profissional sênior da área de Relações Governamentais e estou desenvolvendo o RelMeg, uma ferramenta de inteligência legislativa para organização, análise e visualização de dados parlamentares.

O objetivo é criar um MVP profissional, com aparência de produto SaaS corporativo, focado em transformar uma base importada de parlamentares em informações organizadas, filtros inteligentes e dashboards analíticos.

Priorize:

* Interface limpa e executiva.

* Facilidade de uso.

* Organização dos dados.

* Boa experiência visual.

* Arquitetura preparada para evoluções futuras.

Não criar complexidades desnecessárias. Entregar uma base funcional, estável e bem estruturada.

================================================

PROJETO:

Crie uma aplicação web moderna chamada apenas "RelMeg".

Utilize:

* React

* Tailwind CSS

* Shadcn/ui

* Recharts

O RelMeg é um catálogo analítico interno de parlamentares para Relações Governamentais.

A lógica principal da aplicação é:

O administrador importa uma base real de parlamentares por planilha Excel (.xlsx) ou CSV. A partir desses dados importados, a plataforma gera automaticamente catálogo, indicadores e análises visuais.

IMPORTANTE:

* Não criar dados fictícios.

* Não inserir parlamentares de exemplo.

* A aplicação deve iniciar vazia.

* Todos os indicadores e gráficos devem depender dos dados importados.

* Utilizar LocalStorage para manter os dados salvos no navegador.

================================================

IDENTIDADE VISUAL:

Criar uma interface:

* Tema escuro (Dark Slate).

* Visual executivo e minimalista.

* Inspiração em Power BI e ferramentas SaaS modernas.

* Foco em dados e inteligência.

* Sem fotos de parlamentares.

Criar uma logo simples para o RelMeg:

A logo deve transmitir:

* Legislativo/Congresso.

* Tecnologia.

* Inteligência de dados.

Usar uma referência abstrata à arquitetura do Congresso Nacional brasileiro combinada com elementos modernos de tecnologia.

Características:

* Minimalista.

* Profissional.

* Funcionar em fundo escuro e claro.

* Não usar brasão oficial ou bandeira.

================================================

EXPERIÊNCIA DO USUÁRIO:

Criar uma aplicação fluida e moderna.

Adicionar:

* Transições suaves entre páginas.

* Animações discretas.

* Feedback visual em ações.

* Animações leves em cards, gráficos e painéis.

Manter aparência profissional, sem excesso de efeitos.

================================================

ESTRUTURA DE NAVEGAÇÃO:

Criar Sidebar fixa contendo:

* Catálogo

* Dashboards

* Central de Ajuda

* Admin/Login

Criar no topo cards de indicadores:

* Total de Parlamentares.

* Total Favoráveis.

* UF com maior presença.

* Partido principal.

Adicionar botão:

"Limpar Filtros"

================================================

IMPORTAÇÃO DE DADOS (FUNCIONALIDADE PRINCIPAL):

Criar painel Admin para importar planilhas.

Permitir:

* Upload de Excel (.xlsx).

* Upload de CSV.

* Visualização prévia dos dados.

* Validação básica das colunas.

* Confirmação da importação.

* Salvamento dos dados no LocalStorage.

A planilha deve trabalhar com os seguintes campos:

* Nome do Parlamentar

* Partido

* UF

* Cargo

* Termômetro

* Interesses

* Setor 1

* Setor 2

* Setor 3

* Breve Descrição

* Proposição 1

* Proposição 2

* Proposição 3

* Anotações Internas

Caso não exista nenhuma base:

* Mostrar tela orientando o usuário a importar uma planilha.

* Não mostrar informações simuladas.

================================================

CATÁLOGO:

Criar página de catálogo baseada exclusivamente nos dados importados.

Criar filtros:

* Partido.

* UF.

* Cargo.

* Setor.

* Termômetro.

Permitir combinação dos filtros.

Criar visualizações:

1. Cards dos parlamentares.

2. Tabela compacta.

Ao selecionar um parlamentar:

Abrir painel lateral contendo:

* Nome.

* Partido.

* UF.

* Cargo.

* Posicionamento.

* Setores.

* Descrição.

* Proposições.

* Anotações.

Adicionar botão:

"Copiar Briefing"

Gerar um texto organizado com as principais informações.

================================================

DASHBOARDS:

Criar página de dashboards utilizando Recharts.

Criar gráficos:

1. Parlamentares por UF.

* Barras horizontais.

2. Parlamentares por Partido.

* Gráfico de rosca.

3. Parlamentares por Cargo.

* Barras ou pizza.

4. Parlamentares por Setor.

* Barras.

5. Parlamentares por Termômetro.

* Barras comparativas.

Os gráficos devem:

* Ser alimentados pelos dados importados.

* Atualizar automaticamente.

* Permitir interação básica com filtros.

================================================

ADMIN:

Criar tela simples de login.

Após login:

Permitir:

* Importar planilhas.

* Visualizar base carregada.

* Gerenciar configurações básicas.

Não criar neste momento:

* Sistema complexo de usuários.

* Permissões avançadas.

* Banco de dados externo.

* Edição avançada dentro dos dashboards.

================================================

CENTRAL DE AJUDA:

Criar uma página explicativa contendo:

* Como preparar a planilha.

* Como importar dados.

* Como utilizar filtros.

* Como interpretar gráficos.

* Como copiar briefings.

================================================

PRIORIDADES DE DESENVOLVIMENTO:

1. Importação Excel/CSV funcionando.

2. Leitura e armazenamento dos dados.

3. Catálogo funcional.

4. Filtros.

5. Dashboards.

6. Refinamento visual.

Entregar uma primeira versão funcional do RelMeg, pronta para receber uma planilha real de parlamentares.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://relmeg.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d42e0e31-67ed-4d1f-bba3-8bd78c1c27f7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
