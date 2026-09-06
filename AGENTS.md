# AGENTS.md — Diretrizes arquiteturais do RelMeg

## Regra inegociável: execução estritamente sob demanda

Todas as varreduras, pesquisas e requisições a APIs externas — Câmara dos
Deputados, Senado Federal, Diário Oficial da União (DOU) e TSE — devem ocorrer
**estritamente sob demanda**.

### É terminantemente proibido

- Rotinas de varredura invisíveis em segundo plano;
- *Cron jobs* e tarefas agendadas (inclusive a chave `"crons"` do `vercel.json`);
- Qualquer *polling* automático ou biblioteca de processamento em *background*
  (`BackgroundTasks`, `APScheduler`, Celery, threads/daemons, handlers de
  `startup`/`lifespan` que disparem varreduras, loops com `while True`, etc.);
- Consumo autônomo das APIs governamentais sem ação do usuário.

### O gatilho é sempre o usuário

O motor do sistema só pode ser acionado por uma ação direta e intencional do
operador na interface, como:

- Aplicação de um filtro;
- Seleção de um cliente específico;
- Definição de uma data no calendário do DOU;
- Clique expresso em um botão de busca.

A interface deve aguardar passivamente o comando e exibir estados de carregamento
visual apenas durante a requisição ativa, entregando os resultados em tempo real
após a conclusão desse processamento pontual.

### Justificativa

Proteção absoluta contra o esgotamento dos *rate limits* das APIs públicas
governamentais (evitando bloqueios institucionais), prevenção do consumo
desnecessário de recursos e do sobrecarregamento do servidor.

### Notas de conformidade

- `asyncio.gather` dentro de um handler é permitido: trata-se apenas de concorrência
  de chamadas HTTP dentro de uma requisição on-demand, e não de processamento em
  segundo plano.
- Não adicionar `BackgroundTasks` nem handlers de `startup`/`lifespan` que efetuem
  consultas a APIs externas.
- Não adicionar a chave `"crons"` em nenhum `vercel.json` do repositório.
- Não introduzir `setInterval`/polling no frontend que dispare requisições sem
  interação explícita do usuário.