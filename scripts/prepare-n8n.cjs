const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
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
workflow.nodes.find((node) => node.id === 'refund-callback').parameters.url =
  `=${process.env.N8N_BACKEND_URL || 'http://127.0.0.1:4000'}/api/support/automation/{{ $json.body.caseId }}`;
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
