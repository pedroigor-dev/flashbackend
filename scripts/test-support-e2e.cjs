const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const base = process.env.SUPPORT_E2E_URL || 'http://127.0.0.1:4000/api/support';
(async () => {
  const headers = { 'x-support-session': randomBytes(32).toString('hex') };
  const dashboard = await (await fetch(base, { headers })).json();
  assert.equal(dashboard.integrations.storage, 's3');
  assert.equal(dashboard.integrations.queue, 'sqs');
  assert.equal(dashboard.integrations.automation, true);
  const payload = {
    transactionId: 'tx-market',
    reason: 'duplicate',
    description: 'Demonstração: cobrança duplicada e cancelamento confirmado pela loja.',
    merchantConfirmed: true,
  };
  const idem = randomUUID();
  let response = await fetch(base + '/cases', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Idempotency-Key': idem },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);
  const item = await response.json();
  response = await fetch(base + '/cases', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Idempotency-Key': idem },
    body: JSON.stringify(payload),
  });
  assert.equal((await response.json()).id, item.id);
  const file = fs.readFileSync(
    require('node:path').join(__dirname, '../test/fixtures/receipt.pdf'),
  );
  const body = new FormData();
  body.append('file', new Blob([file], { type: 'application/pdf' }), 'comprovante-demo.pdf');
  response = await fetch(base + `/cases/${item.id}/attachments`, { method: 'POST', headers, body });
  assert.equal(response.status, 201);
  const uploaded = await response.json();
  assert.equal(uploaded.status, 'queued');
  response = await fetch(base + `/cases/${item.id}/attachments/${uploaded.attachments[0].id}`, {
    headers,
    redirect: 'manual',
  });
  assert.equal(response.status, 302);
  const signed = response.headers.get('location');
  const downloaded = await fetch(signed);
  assert.equal(downloaded.status, 200);
  assert.equal(Buffer.compare(Buffer.from(await downloaded.arrayBuffer()), file), 0);
  let status = 'queued';
  for (let i = 0; i < 20 && status === 'queued'; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const current = await (await fetch(base, { headers })).json();
    status = current.cases.find((c) => c.id === item.id).status;
  }
  assert.equal(status, 'reviewing');
  response = await fetch(base + `/cases/${item.id}/simulate`, { method: 'POST', headers });
  assert.equal((await response.json()).status, 'completed');
  const outsider = await fetch(
    base + `/cases/${item.id}/attachments/${uploaded.attachments[0].id}`,
    { headers: { 'x-support-session': randomBytes(32).toString('hex') } },
  );
  assert.equal(outsider.status, 404);
  console.log(
    'AWS E2E aprovado: protocolo idempotente → S3 privado → SQS → n8n → análise → conclusão simulada. Download assinado e isolamento verificados.',
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
