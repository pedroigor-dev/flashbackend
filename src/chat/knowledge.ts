export type KnowledgeEntry = { id: string; title: string; url: string; content: string };

export const reviewedAt = '2026-11-16';

export const knowledge: KnowledgeEntry[] = [
  {
    id: 'historia',
    title: 'História e trajetória da Flash',
    url: 'https://flashapp.com.br/blog/gestao-360-flash',
    content: `O artigo institucional identifica a fundação em São Paulo, em 2019, por Ricardo Salem, Pedro Lane e Guilherme Lane. A proposta nasceu das dificuldades de RHs, usuários e estabelecimentos com benefícios tradicionais. A classificação dos estabelecimentos por MCC ajudou a viabilizar o cartão multibenefícios bandeirado.
Linha do tempo empresarial divulgada: 2019, lançamento do cartão; 2022, investimento de US$ 100 milhões liderado por Battery Ventures e Whale Rock e aquisição da ExpenseOn para entrar em despesas corporativas; 2023, aquisição da FolhaCerta e consolidação da plataforma integrada de benefícios, pessoas e despesas. O artigo também registra autorização como instituição de pagamento pelo Banco Central em 2023. Em 2024, parceria com Visa, lançamento do Clube Flash e marco de um milhão de usuários.
No fim de 2023, a Flash lançou um índice de engajamento dos trabalhadores com FGV-EAESP e Grupo Talenses, não de adoção dos produtos Flash. A evolução do negócio foi ampliar o cartão para tarefas do RH e financeiro. Datas e números são marcos históricos atribuídos ao artigo, não números atuais.`,
  },
  {
    id: 'cultura',
    title: 'Carreiras e cultura Flash',
    url: 'https://flashapp.com.br/carreiras',
    content: `A página de carreiras apresenta cinco eixos culturais: gerar valor junto ao cliente; resolver problemas com pragmatismo; trabalhar coletivamente na direção da estratégia; entregar resultados consistentes com eficiência e dados; aprender e transformar com protagonismo.
Em termos práticos, a comunicação pública associa autonomia a resolver problemas complexos com qualidade e velocidade. Valoriza colaboração, diversidade e aprendizagem. A tecnologia é apresentada como central à plataforma integrada e à solução de problemas reais da jornada de trabalho.
O site organiza áreas como Tecnologia, Gente e Cultura, Revenue e Operações, Financeiro, Jurídico, Riscos e Atendimento ao Cliente. Isso descreve o posicionamento institucional, não prova como cada gestor atua. Para uma entrevista, exemplos de decisões orientadas ao cliente, colaboração entre áreas, aprendizagem com erros e resultados medidos ajudam a conectar experiências pessoais à cultura divulgada. Essa conexão é uma sugestão de preparação, não critério oficial de avaliação.`,
  },
  {
    id: 'institucional',
    title: 'Quem somos e valores',
    url: 'https://flashapp.com.br/quem-somos',
    content: `A Flash se apresenta como uma plataforma para simplificar benefícios, contratação, talentos, pagamentos e despesas. A página institucional também descreve foco no cliente, simplificação de processos, inovação e colaboração. Relaciona excelência a entender necessidades; valor a entregas úteis; eficiência a cumprir compromissos e medir resultados; inovação a melhorias relevantes; colaboração a conhecer outras áreas; aprendizagem a incorporar feedback.
A formulação dessa página difere da lista da página de carreiras. Ao responder quais são os valores atuais de recrutamento, priorize a página de carreiras e explique a diferença se perguntado. Não misture as listas como se fossem uma única enumeração oficial.`,
  },
  {
    id: 'etica',
    title: 'Código de Conduta e Ética — outubro de 2025',
    url: 'https://canaldeetica.com.br/flash/files/Codigo_de_Conduta_e_Etica_V3.0.pdf',
    content: `O Código público de outubro de 2025 aborda igualdade de oportunidades, direitos humanos, diversidade, equidade e inclusão. Rejeita discriminação, assédio, intimidação e violência. Reconhece grupos voluntários de afinidade e transparência salarial.
Conflitos de interesse devem ser comunicados a Compliance; o conflito em si não é automaticamente uma infração, mas omitir seu relato contraria o Código. Há regras contra nepotismo, corrupção, fraude, lavagem de dinheiro e práticas anticoncorrenciais. Presentes não podem comprometer imparcialidade; existem condições e exceções específicas, portanto não simplifique isso como uma permissão geral.
O documento exige proteção de senhas, informações confidenciais e dados pessoais, uso responsável dos recursos digitais e respeito à propriedade intelectual. Prevê proteção de dados conforme a LGPD.
O Canal de Ética aceita relatos identificados ou anônimos, é administrado por empresa independente e prevê confidencialidade e proibição de retaliação contra relatos de boa-fé. O site é canaldeetica.com.br/flash. O Comitê de Ética da Flash apura os relatos; a Diretoria ou Conselho pode deliberar em última instância. O Flashinho não apura relatos.
Isso descreve compromissos normativos publicados, não comprova ausência de irregularidades. Para casos concretos, oriente os canais oficiais sem pedir dados sensíveis no chat.`,
  },
  {
    id: 'arquitetura',
    title: 'História técnica — arquitetura e plataforma',
    url: 'https://flashapp.com.br/blog/historia-da-flash',
    content: `Relato de Paulo Henrique Pereira Cardoso, Principal Engineer, publicado em 17/07/2026: a plataforma começou com React, Node.js, AWS Lambda/serverless e MongoDB. A expansão encontrou sistemas adquiridos em .NET, ASP.NET, EC2, MySQL e SQL Server.
A evolução adotou microsserviços em Kubernetes, imagens Docker, referências de arquitetura hexagonal e DDD, microfrontends e observabilidade com logs, métricas e traces.
Cronologia técnica: 2022, novo ambiente AWS/Kubernetes, início da adoção de NestJS e portal Flashstage baseado em Backstage; 2023, Pessoas inaugurou FlashOS com microfrontends React e BFFs tRPC, enquanto Benefícios e Despesas iniciaram migração; 2024, decisão de reescrever Despesas; 2025, lançamento da nova plataforma de Despesas e decisão semelhante para Pessoas.
Flashstage centraliza catálogo de serviços, documentação e padrões. Tech Radar e Comitê de Tecnologia organizam discussão coletiva de adoção, experimentação, restrição e abandono de tecnologias. O relato destaca times delimitados e ferramentas internas para reduzir atrito.
São etapas e decisões relatadas, não inventário exaustivo de toda a infraestrutura atual. Para datas das aquisições, prefira a cronologia institucional: este relato técnico agrupa a expansão em 2022.`,
  },
  {
    id: 'migracao',
    title: 'Migração incremental de Benefícios para a plataforma',
    url: 'https://flashapp.com.br/blog/construir-a-ponte-enquanto-se-atravessa-a-jornada-pragmatica-de-beneficios-ate-a-plataforma-da-flash',
    content: `Edison Matoso relata, em 06/10/2026, a integração de Benefícios à plataforma sem parar a operação. O SPA existente permaneceu ativo, e a mesma base passou a gerar um segundo build para microfrontend. As adaptações ficaram nas bordas: navegação, sessão, eventos de uso e composição da interface.
A esteira mantinha jobs separados para distribuir os dois artefatos em preview, staging, pré-produção e produção. As jornadas antigas foram substituídas progressivamente, em uma estratégia de estrangulamento do legado.
O caso mostra decisões guiadas por prazo, risco, capacidade do time, necessidades do cliente e custo de manutenção. A migração evitou condicionar o lançamento a uma reescrita completa e permitiu aprender com uso real. É um exemplo concreto de fluxo de entrega e gestão de dívida técnica; não permite afirmar duração de sprints, ferramenta de tickets ou frequência de deploy de todos os times.`,
  },
  {
    id: 'engenharia',
    title: 'Resultados consistentes em engenharia',
    url: 'https://flashapp.com.br/blog/o-que-sustenta-resultados-consistentes-em-engenharia',
    content: `Guilherme Sato relata em 22/09/2026 que consistência envolve escolher uma solução simples adequada ao problema, entregar com qualidade e evoluir a partir de dados e usuários. Evita antecipar complexidade e defende rever decisões quando as evidências mudam. A aceleração com IA exige mais critério de engenharia.
Como exemplo, a plataforma interna de atendimento precisava substituir mais de 60 ferramentas. O time acompanhou a rotina dos atendentes e priorizou os fluxos mais utilizados. Casos menos frequentes continuaram temporariamente nas ferramentas anteriores. O uso real revelou ajustes de navegação e acesso à informação, e o acompanhamento de indicadores passou a orientar melhorias.
Isso permite explicar um ciclo público de trabalho: observar a dor, priorizar, entregar uma parte útil, medir e ajustar. Esse ciclo é uma síntese do caso relatado, não um manual oficial de processos para todos os times.`,
  },
  {
    id: 'vagas',
    title: 'Vaga pública de engenharia de software',
    url: 'https://jobs.lever.co/flashapp/ba441087-16fa-453a-9e17-48426474f5a6',
    content: `A vaga de engenharia sênior consultada cita Node.js, TypeScript, React, arquitetura de serviços e NestJS. Pede experiência com escalabilidade, performance, disponibilidade, microsserviços e APIs REST/GraphQL. Menciona mentoria, code reviews e decisões de design de sistemas, além de colaboração com Produto, Design e Agilidade. Também descreve aprendizagem contínua, feedback e compartilhamento de conhecimento.
A publicação anuncia trabalho remoto e benefícios, mas condições dependem de cada vaga e podem mudar. Não prometa contratação, etapas seletivas, salários ou regime universal da empresa. Para entrevista, pode explicar conceitos técnicos e propor exercícios ou perguntas, identificando-os como preparação e não perguntas reais do processo seletivo.`,
  },
  {
    id: 'produtos',
    title: 'Perguntas oficiais sobre produtos Flash',
    url: 'https://flashapp.com.br/perguntas-e-respostas',
    content: `O portfólio reúne benefícios, pessoas e despesas para RH, DP e Financeiro. Pessoas cobre etapas como admissão digital, onboarding, ponto, férias e desligamento. Despesas atende controle de gastos corporativos e prestação de contas. A plataforma busca reduzir tarefas manuais e fragmentação entre sistemas.
O site distingue perfis de administrador, colaborador e líder. O colaborador usa funções relacionadas aos benefícios e à sua jornada; administradores gerenciam configurações e processos; lideranças acompanham aprovações conforme permissões. Produtos e recursos disponíveis dependem da contratação.
O Flashinho pode explicar casos de uso: um RH organiza benefícios e admissões; um financeiro acompanha despesas; um colaborador consulta benefícios e realiza solicitações. Não atribua um recurso contratado a uma conta específica. Valores comerciais e condições devem ser confirmados com a Flash.`,
  },
  {
    id: 'beneficios',
    title: 'Gestão de benefícios Flash',
    url: 'https://flashapp.com.br/gestao-de-beneficios',
    content: `A solução reúne cartão multibenefícios e gestão para empresas. Categorias incluem alimentação, refeição, mobilidade, saúde, educação e cultura, conforme configuração. O cartão utiliza bandeira Visa. Ter bandeira aberta não significa aprovação irrestrita: categoria, saldo, atividade do estabelecimento e regras do benefício importam. A empresa define benefícios disponíveis; valores destinados à alimentação/refeição têm finalidade específica.
Não trate benefício como dinheiro livre nem ensine conversão irregular de saldo. Para uma compra recusada, explique possibilidades gerais sem afirmar diagnóstico: conferir saldo e categoria no app, dados da transação e buscar o RH ou suporte oficial. Não peça senha, CPF, código de autenticação ou número completo do cartão. O assistente não consulta transações nem altera benefícios.`,
  },
  {
    id: 'ia',
    title: 'IA aplicada na plataforma Flash',
    url: 'https://flashapp.com.br/blog/inteligencia-artificial-plataforma-flash',
    content: `Artigo de 15/04/2026 descreve dois grupos de IA: automações integradas aos processos e copilotos que interagem com usuários. Exemplos divulgados incluem insights sobre benefícios, coleta e conferência de documentos na admissão, OCR para extrair e classificar documentos, apoio ao cadastro de benefícios externos, onboarding no app e elaboração de feedback para revisão do gestor.
A proposta é reduzir trabalho operacional e apoiar decisões de RH. São funcionalidades apresentadas pela empresa; disponibilidade depende do produto e contrato. Não conclua qual LLM, nuvem ou fornecedor a Flash usa internamente: o artigo não comprova isso.
O Flashinho deste projeto é um demonstrador independente com Groq/Hugging Face e não é o Copiloto oficial da Flash. Não executa os fluxos descritos no artigo.`,
  },
];

export const sources = knowledge.map(({ title, url }) => ({ title, url }));
