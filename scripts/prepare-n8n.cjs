const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const demoMode = process.argv.includes('--demo');
const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
let env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const existing = env.match(/^SUPPORT_AUTOMATION_TOKEN=(.+)$/m)?.[1]?.trim();
const token = existing || randomBytes(32).toString('hex');
if (!existing) {
  env += `\nSUPPORT_AUTOMATION_TOKEN=${token}\n`;
}
if (!/^N8N_REFUND_WEBHOOK_URL=.+$/m.test(env)) {
  env = env.replace(/^N8N_REFUND_WEBHOOK_URL=.*$/gm, '');
  env += 'N8N_REFUND_WEBHOOK_URL=http://127.0.0.1:5678/webhook/flashinho-refunds\n';
}
fs.writeFileSync(envFile, env, { mode: 0o600 });
const directory = path.join(root, 'data', 'n8n-import');
fs.mkdirSync(directory, { recursive: true });
const workflow = JSON.parse(
  fs.readFileSync(path.join(root, 'automation', 'refund-triage.json'), 'utf8'),
);
const callback = workflow.nodes.find((node) => node.id === 'refund-callback');
callback.parameters.url = `=${process.env.N8N_BACKEND_URL || 'http://127.0.0.1:4000'}/api/support/automation/{{ $json.body.caseId }}`;
if (demoMode) {
  const steps = workflow.nodes.flatMap((node, index) => {
    node.position = [index * 440, 0];
    if (index === workflow.nodes.length - 1) return [node];

    return [
      node,
      {
        id: `demo-after-${node.id}`,
        name: index === 0 ? 'Demo · Antes da triagem' : 'Demo · Antes da confirmação',
        type: 'n8n-nodes-base.wait',
        typeVersion: 1.1,
        position: [node.position[0] + 220, 0],
        parameters: { resume: 'timeInterval', amount: 4, unit: 'seconds' },
      },
    ];
  });
  workflow.nodes = steps;
  workflow.connections = Object.fromEntries(
    steps
      .slice(0, -1)
      .map((node, index) => [
        node.name,
        { main: [[{ node: steps[index + 1].name, type: 'main', index: 0 }]] },
      ]),
  );
  callback.parameters.options.timeout = 5000;
}
fs.writeFileSync(path.join(directory, 'workflow.json'), JSON.stringify(workflow, null, 2));
fs.writeFileSync(
  path.join(directory, 'credentials.json'),
  JSON.stringify([
    {
      id: 'flashinho-automation',
      name: 'Flashinho automation',
      type: 'httpHeaderAuth',
      data: { name: 'x-automation-token', value: token },
    },
  ]),
  { mode: 0o600 },
);
console.log('Workflow e credencial preparados em data/n8n-import. Nenhum segredo foi impresso.');
