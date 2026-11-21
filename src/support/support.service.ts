import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { CreateRefundDto } from './support.dto';
import { SupportStore } from './support.store';
import { Attachment, RefundCase, transactions } from './support.types';

@Injectable()
export class SupportService {
  constructor(
    readonly store: SupportStore,
    private readonly config: ConfigService,
  ) {}

  session(value?: string) {
    if (!value || !/^[a-f0-9]{64}$/.test(value)) {
      throw new UnauthorizedException('Sua sessão de demonstração expirou. Recarregue a página.');
    }
    return createHash('sha256').update(value).digest('hex');
  }

  publicCase(item: RefundCase) {
    const { session, ...data } = item;
    return {
      ...data,
      attachments: data.attachments.map(({ key, ...file }) => file),
      transaction: transactions.find((tx) => tx.id === item.transactionId),
    };
  }

  owned(id: string, session: string) {
    const item = this.store.find(id);
    if (!item || item.session !== session) {
      throw new NotFoundException('Atendimento não encontrado.');
    }
    return item;
  }

  event(item: RefundCase, title: string, detail: string) {
    item.updatedAt = new Date().toISOString();
    item.events.push({ id: randomUUID(), title, detail, at: item.updatedAt });
  }

  enqueue(item: RefundCase) {
    this.store.db
      .prepare('INSERT INTO support_outbox (id, case_id) VALUES (?, ?)')
      .run(randomUUID(), item.id);
  }

  create(session: string, key: string | undefined, dto: CreateRefundDto) {
    if (!key || !/^[a-f0-9-]{36}$/.test(key)) {
      throw new BadRequestException('Informe uma chave de idempotência válida.');
    }
    if (dto.description.trim().length < 10) {
      throw new BadRequestException('Conte um pouco mais sobre o ocorrido.');
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(dto)).digest('hex');
    return this.store.transaction(() => {
      const previous = this.store.db
        .prepare(
          'SELECT fingerprint, case_id FROM support_requests WHERE session = ? AND request_key = ?',
        )
        .get(session, key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw new ConflictException('Esta solicitação já foi usada com outros dados.');
        }
        return this.publicCase(this.owned(previous.case_id as string, session));
      }
      const existing = this.store
        .list(session)
        .find((item) => item.transactionId === dto.transactionId);
      if (existing) {
        throw new ConflictException(
          'Esta compra já tem um atendimento. Acompanhe o protocolo existente.',
        );
      }
      const now = new Date().toISOString();
      const item: RefundCase = {
        id: randomUUID(),
        protocol: `FL-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`,
        session,
        transactionId: dto.transactionId,
        reason: dto.reason,
        description: dto.description.trim(),
        status: dto.merchantConfirmed ? 'waiting_receipt' : 'waiting_merchant',
        createdAt: now,
        updatedAt: now,
        attachments: [],
        events: [],
      };
      this.event(
        item,
        'Atendimento aberto',
        'Seu relato foi registrado neste ambiente de demonstração.',
      );
      this.event(
        item,
        dto.merchantConfirmed ? 'Comprovante pendente' : 'Converse com o estabelecimento',
        dto.merchantConfirmed
          ? 'Anexe o comprovante de cancelamento para seguir com a análise demonstrativa.'
          : 'Solicite o cancelamento e guarde o comprovante. O estabelecimento precisa iniciar essa etapa.',
      );
      this.store.save(item);
      this.store.db
        .prepare('INSERT INTO support_requests VALUES (?, ?, ?, ?)')
        .run(session, key, fingerprint, item.id);
      return this.publicCase(item);
    });
  }

  confirmMerchant(id: string, session: string) {
    return this.store.transaction(() => {
      const item = this.owned(id, session);
      if (item.status === 'waiting_merchant') {
        item.status = 'waiting_receipt';
        this.event(
          item,
          'Cancelamento informado',
          'Você confirmou o contato com o estabelecimento. Agora falta anexar o comprovante fictício.',
        );
        this.store.save(item);
      }
      return this.publicCase(item);
    });
  }

  attach(id: string, session: string, attachment: Attachment) {
    return this.store.transaction(() => {
      const item = this.owned(id, session);
      if (item.status !== 'waiting_receipt') {
        throw new ConflictException('Este atendimento não está aguardando um comprovante.');
      }
      item.attachments.push(attachment);
      item.status = 'queued';
      this.event(
        item,
        'Comprovante recebido',
        'Arquivo guardado com acesso privado. A triagem automática está na fila.',
      );
      this.store.save(item);
      this.enqueue(item);
      return this.publicCase(item);
    });
  }

  verifyAutomation(token?: string) {
    const expected = this.config.get<string>('SUPPORT_AUTOMATION_TOKEN', '');
    if (
      !expected ||
      !token ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    ) {
      throw new UnauthorizedException('Credencial de automação inválida.');
    }
  }

  completeTriage(id: string, eventId: string) {
    return this.store.transaction(() => {
      const event = this.store.db
        .prepare('SELECT case_id FROM support_outbox WHERE id = ?')
        .get(eventId);
      if (!event || event.case_id !== id) {
        throw new BadRequestException('Evento de triagem inválido.');
      }
      if (this.store.db.prepare('SELECT id FROM support_processed WHERE id = ?').get(eventId)) {
        return { eventId, processed: true };
      }
      const item = this.store.find(id);
      if (!item) {
        throw new NotFoundException();
      }
      if (item.status === 'queued') {
        item.status = 'reviewing';
        this.event(
          item,
          'Triagem concluída pelo n8n',
          'Comprovante encaminhado para análise humana. A automação organiza o caso e não autoriza devoluções.',
        );
        this.store.save(item);
      }
      this.store.db.prepare('INSERT INTO support_processed VALUES (?)').run(eventId);
      return { eventId, processed: true };
    });
  }

  simulateCompletion(id: string, session: string) {
    if (this.config.get('SUPPORT_DEMO_ENABLED', 'true') !== 'true') {
      throw new NotFoundException();
    }
    return this.store.transaction(() => {
      const item = this.owned(id, session);
      if (item.status === 'completed') {
        return this.publicCase(item);
      }
      if (item.status !== 'reviewing') {
        throw new ConflictException('Aguarde a triagem antes de simular a conclusão.');
      }
      item.status = 'completed';
      this.event(
        item,
        'Estorno demonstrativo concluído',
        'Você acionou uma simulação. Nenhum saldo real foi alterado e nenhuma solicitação foi enviada à Flash.',
      );
      this.store.save(item);
      return this.publicCase(item);
    });
  }
}
