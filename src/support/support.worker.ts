import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { SupportStore } from './support.store';

@Injectable()
export class SupportWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupportWorker.name);
  private readonly sqs: SQSClient;
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private readonly abort = new AbortController();

  constructor(
    private readonly store: SupportStore,
    private readonly config: ConfigService,
  ) {
    this.sqs = new SQSClient({ region: config.get('AWS_REGION', 'us-east-2') });
  }

  onModuleInit() {
    if (this.config.get('SUPPORT_WORKER_ENABLED', 'true') === 'true') {
      this.timer = setTimeout(() => void this.tick(), 1000);
    }
  }

  async dispatch(event: { id: string; caseId: string }) {
    const url = this.config.get<string>('N8N_REFUND_WEBHOOK_URL');
    const token = this.config.get<string>('SUPPORT_AUTOMATION_TOKEN');
    if (!url || !token) {
      throw new Error('Configure o webhook e a credencial do n8n.');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-automation-token': token },
      body: JSON.stringify(event),
      signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok) {
      throw new Error('Falha no workflow de triagem.');
    }
    const result = await response.json();
    if (
      result.eventId !== event.id ||
      result.processed !== true ||
      !this.store.db.prepare('SELECT id FROM support_processed WHERE id = ?').get(event.id)
    ) {
      throw new Error('O workflow não confirmou a triagem no backend.');
    }
  }

  async tick() {
    try {
      const queueUrl = this.config.get<string>('SUPPORT_SQS_URL');
      const rows = this.store.db
        .prepare(
          "SELECT id, case_id, attempts FROM support_outbox WHERE status = 'pending' AND next_at <= ? LIMIT 5",
        )
        .all(Date.now());
      for (const row of rows) {
        const event = { id: row.id as string, caseId: row.case_id as string };
        try {
          if (queueUrl) {
            await this.sqs.send(
              new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(event) }),
              { abortSignal: this.abort.signal },
            );
          } else {
            await this.dispatch(event);
          }
          this.store.db
            .prepare('UPDATE support_outbox SET status = ? WHERE id = ?')
            .run(queueUrl ? 'published' : 'done', event.id);
        } catch {
          if (this.stopped) {
            return;
          }
          const attempts = Number(row.attempts) + 1;
          this.store.db
            .prepare('UPDATE support_outbox SET attempts = ?, next_at = ? WHERE id = ?')
            .run(
              attempts,
              Date.now() + Math.min(60000, 1000 * 2 ** Math.min(attempts, 6)),
              event.id,
            );
          this.logger.warn(`Triagem pendente; tentativa ${attempts}. Evento ${event.id}`);
        }
      }
      if (queueUrl && !this.stopped) {
        const result = await this.sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 2,
            VisibilityTimeout: 60,
          }),
          { abortSignal: this.abort.signal },
        );
        for (const message of result.Messages || []) {
          try {
            const event = JSON.parse(message.Body || '');
            if (typeof event.id !== 'string' || typeof event.caseId !== 'string') {
              throw new Error('Evento inválido');
            }
            await this.dispatch(event);
            await this.sqs.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle,
              }),
              { abortSignal: this.abort.signal },
            );
            this.store.db
              .prepare("UPDATE support_outbox SET status = 'done' WHERE id = ?")
              .run(event.id);
          } catch {
            this.logger.warn(
              'Mensagem não confirmada; SQS fará nova tentativa conforme a política da fila.',
            );
          }
        }
      }
    } catch {
      if (!this.stopped) {
        this.logger.warn('Fila temporariamente indisponível.');
      }
    } finally {
      if (!this.stopped) {
        this.timer = setTimeout(() => void this.tick(), 3000);
      }
    }
  }

  onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.abort.abort();
    this.sqs.destroy();
  }
}
