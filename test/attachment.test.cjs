const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { ConfigService } = require('@nestjs/config');
const { AttachmentStorage } = require('../dist/support/attachment.storage');
test('anexos rejeitam conteúdo incompatível e preservam arquivos locais após ativar S3', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'flash-receipt-'));
  try {
    const storage = new AttachmentStorage(new ConfigService({ SUPPORT_UPLOAD_DIR: directory }));
    await assert.rejects(
      storage.save('case', {
        buffer: Buffer.from('<script>'),
        size: 8,
        mimetype: 'application/pdf',
        originalname: 'fake.pdf',
      }),
      (e) => e.getStatus() === 400,
    );
    const bytes = Buffer.from('%PDF-1.4\nTest receipt\n%%EOF');
    const file = await storage.save('case', {
      buffer: bytes,
      size: bytes.length,
      mimetype: 'application/pdf',
      originalname: 'receipt.pdf',
    });
    const configured = new AttachmentStorage(
      new ConfigService({ SUPPORT_UPLOAD_DIR: directory, SUPPORT_S3_BUCKET: 'demo-bucket' }),
    );
    assert.deepEqual((await configured.download(file)).bytes, bytes);
    await configured.remove(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
