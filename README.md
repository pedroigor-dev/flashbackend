# Flashinho API

Backend local em NestJS 11, Node.js e TypeScript. Integração com Groq ou Hugging Face via API de chat completions. A configuração atual usa Groq. Frontend em `C:\source\flashproject`.

## Executar

Requer Node.js 22 ou superior. Na pasta deste projeto:

```powershell
npm install
# Preencha .env usando .env.example como referência; nunca compartilhe as chaves de API.
npm run dev
```

API em `http://127.0.0.1:4000/api`. Build: `npm run build`; executar build: `npm start`; testes: `npm test`.

O frontend Next.js usa `/api/chat` como intermediário no servidor. `FLASH_BACKEND_URL` pode alterar o endereço do backend; por padrão usa a porta 4000. Nenhuma credencial dos provedores é enviada ao navegador. O token fica no `.env` ignorado pelo Git.

## Contrato

- `GET /api/health`: situação da API e se uma credencial está configurada (não verifica créditos ou validade).
- `POST /api/chat`: `{ "messages": [{ "role": "user", "content": "O que é a Flash?" }] }`.
- Resposta: `{ "text": "...", "sources": [...], "model": "...", "provider": "groq" }`.
- Histórico: máximo de 20 mensagens, 4.000 caracteres cada. Aceita apenas papéis user e assistant.
- 400: entrada inválida; 429: limite de requisições; 502/503: provedor/configuração/créditos; 504: tempo limite.

## Decisões

- NestJS, TypeScript e Node.js aparecem nas vagas oficiais da Flash. A empresa também menciona React, MongoDB e bancos relacionais. Next.js é uma escolha do frontend deste conceito.
- A base oficial curada em `src/chat/knowledge.ts` é adicionada pelo servidor. O modelo pode usar o histórico para continuar a conversa, mas não tem acesso a contas Flash nem pesquisa ao vivo. As fontes retornadas são referências da base, não citações verificadas frase por frase. Não é RAG vetorial.
- Conversas continuam armazenadas apenas no navegador. Não foi introduzido banco sem autenticação/isolamento de usuários. MongoDB pode ser adicionado quando houver contas e persistência no servidor.
- Timeout de 45 segundos, cancelamento, validação DTO, limite de corpo de 96 KB, Helmet e 20 requisições por minuto por IP. Como o Next faz proxy, esse limite é compartilhado na execução local.
- Servidor vinculado ao loopback. Esta entrega é para desenvolvimento/demonstração local. Publicação multiusuário exige autenticação, cotas individuais e armazenamento distribuído do limitador.
- Sem fallback de respostas inventadas quando a IA falha. O usuário recebe um erro com opção de tentar novamente.
- Prompts e respostas não são registrados pelo aplicativo. O conteúdo enviado passa pelo provedor configurado (Groq ou Hugging Face). O histórico local anterior pode ser enviado como contexto.
- `HF_MODEL` permite selecionar outro modelo/provedor; o sufixo `:cheapest` solicita roteamento econômico. Inferência depende de disponibilidade e créditos. Nenhuma recarga automática é configurada.

## Fontes

- https://jobs.lever.co/flashapp/8ec8070d-d843-4452-a2e7-3b1290ff9f0d
- https://huggingface.co/docs/inference-providers/tasks/chat-completion
- https://docs.nestjs.com/techniques/validation

## Groq (alternativa gratuita)

O provedor pode ser trocado sem alterar o contrato do chat. Para Groq, configure no `.env`:

```dotenv
AI_PROVIDER=groq
GROQ_MODEL=openai/gpt-oss-120b
GROQ_API_KEY=seu_token
```

`AI_PROVIDER=huggingface` usa `HF_TOKEN` e `HF_MODEL`. Reinicie o backend após alterar `.env`. A Groq tem uma faixa gratuita sujeita aos limites da conta e do modelo; nenhum plano pago é ativado por este código. Consulte https://console.groq.com/docs/rate-limits. As mensagens vão somente para o provedor selecionado, sem fallback automático para outro serviço.

Na máquina atual, a Flash está na porta **3200**, pois a porta 3000 está ocupada por outro projeto. Inicie o frontend com `npm run dev -- --port 3200`.
