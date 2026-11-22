const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChatService } = require('../dist/chat/chat.service');
const { ConfigService } = require('@nestjs/config');
const { answerCurrentStep, supportContext } = require('../dist/support/support-context');

test('a mesma pergunta acompanha a etapa registrada no protocolo', () => {
  const question = 'Qual é a etapa do meu estorno agora e o que eu preciso fazer?';
  assert.match(answerCurrentStep({ status: 'waiting_merchant' }, question), /Aguardando a loja/);
  assert.match(answerCurrentStep({ status: 'waiting_receipt' }, question), /Comprovante pendente/);
  const reviewing = answerCurrentStep({ status: 'reviewing' }, question);
  assert.match(reviewing, /Em análise/);
  assert.match(reviewing, /marcar o caso de teste como concluído/);
  assert.doesNotMatch(reviewing, /peça o cancelamento|dias úteis/i);
  assert.equal(
    answerCurrentStep({ status: 'reviewing' }, 'Como funciona um estorno de verdade na Flash?'),
    undefined,
  );
});

test('orientação do protocolo usa instruções próprias e não atribui devoluções reais à POC', async () => {
  const original = global.fetch;
  try {
    global.fetch = async (_, init) => {
      const body = JSON.parse(init.body);
      assert.match(body.messages[0].content, /Não existe uma equipe real/);
      assert.match(body.messages[0].content, /Simular conclusão/);
      assert.equal(body.messages[1].content, 'Qual o próximo passo?');
      return Response.json({
        choices: [
          {
            message: {
              content:
                'A triagem demonstrativa terminou. Você pode usar o botão Simular conclusão.',
            },
          },
        ],
      });
    };
    const service = new ChatService(
      new ConfigService({ AI_PROVIDER: 'groq', GROQ_API_KEY: 'test-only' }),
    );
    const answer = await service.reply(
      { messages: [{ role: 'user', content: 'Qual o próximo passo?' }] },
      undefined,
      supportContext({ status: 'reviewing', attachments: [{}] }),
    );
    assert.match(answer.text, /demonstrativa/);
  } finally {
    global.fetch = original;
  }
});
