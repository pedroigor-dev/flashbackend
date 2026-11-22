const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { SupportStore } = require('../dist/support/support.store');
const { SupportService } = require('../dist/support/support.service');
const { SupportWorker } = require('../dist/support/support.worker');
const dto = {
  transactionId: 'tx-market',
  reason: 'cancelled',
  description: 'A loja cancelou o pedido de teste.',
  merchantConfirmed: false,
};

function setup() {
  const config = new ConfigService({
    SUPPORT_DATABASE: ':memory:',
    SUPPORT_AUTOMATION_TOKEN: 'test-automation-token',
    N8N_REFUND_WEBHOOK_URL: 'http://n8n.invalid/webhook/refunds',
  });
  const store = new SupportStore(config);
  return { store, service: new SupportService(store, config), config };
}

test('abertura é idempotente e isola atendimentos por sessão', () => {
  const { store, service } = setup();
  try {
    const session = service.session('a'.repeat(64));
    const key = randomUUID();
    const first = service.create(session, key, dto);
    assert.equal(service.create(session, key, dto).id, first.id);
    assert.equal(store.list(session).length, 1);
    assert.throws(
      () => service.create(session, key, { ...dto, reason: 'duplicate' }),
      (e) => e.getStatus() === 409,
    );
    assert.throws(
      () => service.create(session, randomUUID(), dto),
      (e) => e.getStatus() === 409,
    );
    assert.throws(
      () => service.owned(first.id, service.session('b'.repeat(64))),
      (e) => e.getStatus() === 404,
    );
    assert.ok(!('session' in first));
  } finally {
    store.onModuleDestroy();
  }
});

test('máquina de estados exige comprovante e callback autenticado não duplica o histórico', () => {
  const { store, service } = setup();
  try {
    const session = service.session('a'.repeat(64));
    const item = service.create(session, randomUUID(), dto);
    assert.throws(
      () => service.simulateCompletion(item.id, session),
      (e) => e.getStatus() === 409,
    );
    assert.throws(
      () => service.attach(item.id, session, {}),
      (e) => e.getStatus() === 409,
    );
    service.confirmMerchant(item.id, session);
    const attached = service.attach(item.id, session, {
      id: randomUUID(),
      key: 'private/test',
      name: 'test.pdf',
      size: 20,
      type: 'application/pdf',
    });
    assert.equal(attached.status, 'queued');
    assert.ok(!('key' in attached.attachments[0]));
    assert.throws(
      () => service.verifyAutomation('incorrect'),
      (e) => e.getStatus() === 401,
    );
    service.verifyAutomation('test-automation-token');
    const event = store.db.prepare('SELECT id FROM support_outbox').get();
    service.completeTriage(item.id, event.id);
    const length = store.find(item.id).events.length;
    service.completeTriage(item.id, event.id);
    assert.equal(store.find(item.id).events.length, length);
    assert.equal(service.simulateCompletion(item.id, session).status, 'completed');
    assert.equal(service.simulateCompletion(item.id, session).events.length, length + 1);
  } finally {
    store.onModuleDestroy();
  }
});

test('worker só confirma entrega depois do callback; falhas permanecem recuperáveis', async () => {
  const { store, service, config } = setup();
  const original = global.fetch;
  const worker = new SupportWorker(store, config);
  try {
    const session = service.session('a'.repeat(64));
    const item = service.create(session, randomUUID(), { ...dto, merchantConfirmed: true });
    service.attach(item.id, session, {
      id: randomUUID(),
      key: 'test',
      name: 'test.pdf',
      type: 'application/pdf',
      size: 10,
    });
    const event = store.db.prepare('SELECT id, case_id FROM support_outbox').get();
    const payload = { id: event.id, caseId: event.case_id };
    global.fetch = async () => Response.json({ eventId: event.id, processed: true });
    await assert.rejects(worker.dispatch(payload));
    global.fetch = async (_, init) => {
      assert.equal(init.headers['x-automation-token'], 'test-automation-token');
      const sent = JSON.parse(init.body);
      return Response.json(service.completeTriage(sent.caseId, sent.id));
    };
    await worker.dispatch(payload);
    assert.equal(store.find(item.id).status, 'reviewing');

    config.set('N8N_REFUND_WEBHOOK_URL', 'http://localhost:5678/webhook/flashinho-refunds');
    config.set('N8N_REFUND_LIVE_DEMO', 'true');
    const called = [];
    global.fetch = async (url) => {
      called.push(new URL(url).pathname);
      if (called.length === 1) {
        return Response.json(
          { message: 'The requested webhook "flashinho-refunds" is not registered.' },
          { status: 404 },
        );
      }
      return Response.json({ eventId: event.id, processed: true });
    };
    await worker.dispatch(payload);
    assert.deepEqual(called, ['/webhook-test/flashinho-refunds', '/webhook/flashinho-refunds']);
  } finally {
    global.fetch = original;
    worker.onModuleDestroy();
    store.onModuleDestroy();
  }
});
