# Central de estornos

A central é uma POC independente, com compras fictícias. A aplicação registra o caso, guarda um comprovante de teste e acompanha a triagem. Não acessa contas Flash, não cancela transações e não movimenta dinheiro.

## Caminho de uma solicitação

```mermaid
sequenceDiagram
  participant U as Usuário
  participant F as Next.js
  participant B as NestJS
  participant D as SQLite / outbox
  participant S as S3 privado
  participant Q as SQS
  participant N as n8n
  U->>F: Abrir protocolo (chave de idempotência)
  F->>B: Sessão de demonstração
  B->>D: Caso e histórico
  U->>F: Comprovante fictício
  F->>B: Upload limitado a 5 MB
  B->>S: Guardar arquivo privado
  B->>D: Comprovante + evento na mesma transação
  B->>Q: Publicar evento
  Q->>B: Consumir mensagem
  B->>N: Webhook autenticado
  N->>B: Confirmar triagem (evento idempotente)
  B->>D: Atualizar histórico
  N-->>B: Confirmar execução
  B->>Q: Excluir mensagem confirmada
  U->>F: Simular conclusão
  F->>B: Encerrar somente o caso demonstrativo
```

## Rodar o backend

Use Node.js 24 ou superior, pois a persistência utiliza `node:sqlite` (API ainda experimental nessa versão). Instale as dependências e preencha `.env` a partir de `.env.example`.

```bash
npm ci
node scripts/prepare-n8n.cjs
npm run dev
```

O script gera a credencial de automação e os arquivos de importação dentro de `data/`, ignorado pelo Git. Ele reutiliza a credencial existente. Não publique `.env`, `data/` nem os arquivos gerados de credenciais.

Sem `SUPPORT_S3_BUCKET` e `SUPPORT_SQS_URL`, os arquivos ficam no disco e a outbox entrega diretamente ao n8n. Isso permite testar a jornada sem AWS. O backend informa qual modo está usando. O n8n continua sendo necessário para concluir a triagem: sua indisponibilidade mantém o evento pendente.

## n8n com Docker

A versão está fixada no `compose.yaml`. Antes de preparar a importação para Docker, configure `N8N_BACKEND_URL=http://host.docker.internal:4000` no terminal que executará `prepare-n8n.cjs`.

```bash
node scripts/prepare-n8n.cjs
docker compose run --rm n8n import:credentials --input=/imports/credentials.json
docker compose run --rm n8n import:workflow --input=/imports/workflow.json
docker compose run --rm n8n publish:workflow --id=flashinho-refund-triage
docker compose up -d
```

O editor fica em `http://localhost:5678`. Conclua a criação do proprietário diretamente no editor para acessar a interface. As portas estão limitadas ao computador local. `N8N_SECURE_COOKIE=false` atende somente ao HTTP local; uma publicação precisa de HTTPS e cookies seguros.

O workflow recebe apenas `id` do evento e `caseId`; não recebe arquivo, descrição, dados de cartão ou a credencial AWS. O Header Auth protege entrada e callback. O HTTP Request registra o encaminhamento e o Respond to Webhook devolve a confirmação. A triagem não valida a autenticidade do comprovante nem decide o estorno. Os dados das execuções bem-sucedidas e com erro não são persistidos pelo workflow.

### Alternativa local sem Docker

Para desenvolvimento, a versão 2.48.7 também pode ser executada pelo Node, embora o fornecedor esteja descontinuando esse modo. Configure `N8N_USER_FOLDER` para uma pasta privada dentro de `data/`, `N8N_LISTEN_ADDRESS=127.0.0.1`, `N8N_DIAGNOSTICS_ENABLED=false` e `N8N_SECURE_COOKIE=false`. Execute os mesmos comandos `import:credentials`, `import:workflow`, `publish:workflow` e `start` com `npx --yes --package=n8n@2.48.7 n8n`. Em produção, prefira a imagem oficial e configure os task runners externos caso use nós de código; este workflow utiliza apenas nós HTTP e Webhook.

## AWS

`infra/refunds.template.json` cria:

- Bucket S3 com acesso público bloqueado, ACLs desativadas, criptografia AES256, exigência de HTTPS e expiração de objetos após 7 dias.
- Fila SQS padrão criptografada, com visibilidade de 60 segundos.
- Fila de falhas após 5 recebimentos sem sucesso, retenção de 14 dias.
- Usuário sem acesso ao console, limitado a objetos em `refunds/*` no bucket e às operações necessárias na fila principal.

O template não contém chaves. Para uma aplicação hospedada na AWS, prefira uma role com credenciais temporárias. A chave do usuário atende ao desenvolvimento local e deve ser desativada quando deixar de ser necessária.

```bash
aws cloudformation deploy --stack-name flashinho-demo --template-file infra/refunds.template.json --capabilities CAPABILITY_NAMED_IAM --region us-east-2
aws cloudformation describe-stacks --stack-name flashinho-demo --region us-east-2 --query 'Stacks[0].Outputs'
```

Preencha o bucket e a URL da fila no `.env`, configure as credenciais e reinicie o backend. O bucket é retido se a stack for excluída; não presuma que excluir a stack apaga todos os arquivos. S3/SQS geram consumo sujeito ao plano da conta. Parar o backend interrompe o polling local da fila.

## Segurança e recuperação

A sessão de demonstração usa um segredo aleatório de 256 bits, guardado em cookie HttpOnly e SameSite Strict pelo Next.js. O banco guarda seu hash. Cada protocolo e anexo é restrito à sessão que o criou. Isso não substitui autenticação de usuários: limpar os cookies perde o acesso aos protocolos anteriores. É um ambiente para dados fictícios, não um portal pronto para clientes reais.

O proxy permite apenas as rotas previstas e verifica a origem das mutações. O backend limita uploads, confere assinatura básica e tipo de arquivo e força download como anexo. Essa validação não equivale a antivírus; arquivos de clientes reais exigiriam análise de malware, política de retenção, identidade e controles adicionais.

A criação usa `Idempotency-Key`; reutilizar a chave com conteúdo diferente retorna 409. A combinação sessão/compra também impede protocolos repetidos. O comprovante e a outbox são persistidos na mesma transação SQLite. Se o processo cair após publicar no SQS e antes de marcar o evento como publicado, poderá ocorrer entrega duplicada. O callback deduplica pelo ID do evento na mesma transação que registra o histórico.

Falhas de publicação permanecem na outbox com tentativas e espera progressiva. Falhas de consumo não excluem a mensagem do SQS. Se o n8n falhar, corrija a configuração; a fila tentará novamente. Se a mensagem chegar à DLQ, reenvie-a à fila de origem pelo console SQS após corrigir a causa. O callback só é aceito para um evento da outbox pertencente ao protocolo.

O worker pressupõe uma única instância de backend e o mesmo banco local para produção e consumo. Antes de escalar horizontalmente, migre a persistência para PostgreSQL, use leases na outbox e separe API e workers. SQLite simplifica a execução desta POC e não é apresentado como arquitetura de alta disponibilidade.

## Estados

| Estado             | Próximo passo                                          |
| ------------------ | ------------------------------------------------------ |
| `waiting_merchant` | Usuário informa o contato com o estabelecimento        |
| `waiting_receipt`  | Anexar comprovante fictício                            |
| `queued`           | Aguardar a confirmação do n8n                          |
| `reviewing`        | A triagem encaminhou o caso para análise demonstrativa |
| `completed`        | Usuário acionou a conclusão simulada                   |

`SUPPORT_DEMO_ENABLED=false` remove o encerramento simulado da interface e da API. O texto de cada evento registra o que ocorreu, sem alegar uma devolução financeira real.

## Validação

`npm test` executa testes isolados sem consumir AWS ou IA. Cobre autorização por sessão, idempotência, transições inválidas, callback duplicado, confirmação do worker e validação de arquivos. A execução de ponta a ponta com serviços reais é feita separadamente com arquivos fictícios. A referência funcional é o [guia público de estornos da Flash](https://faq.flashapp.com.br/kb/guide/pt-BR/como-funciona-o-estorno-e-o-que-fazer-em-caso-de-cobranca-duplicada-YCKtRTryEC/Steps/4198154), consultado em 21/11/2026.
