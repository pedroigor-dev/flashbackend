import { supportContext } from './support-context';
import { ChatService } from '../chat/chat.service';
import { SupportQuestionDto } from './support.dto';
import {
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  ConflictException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { SupportService } from './support.service';
import { AttachmentStorage } from './attachment.storage';
import { CreateRefundDto, AutomationCallbackDto } from './support.dto';
import { transactions, refundGuide } from './support.types';
import { ConfigService } from '@nestjs/config';

@Controller('support')
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class SupportController {
  constructor(
    private readonly support: SupportService,
    private readonly storage: AttachmentStorage,
    private readonly config: ConfigService,
    private readonly chat: ChatService,
  ) {}

  @Get()
  dashboard(@Headers('x-support-session') token: string) {
    const session = this.support.session(token);
    return {
      transactions,
      cases: this.support.store.list(session).map((item) => this.support.publicCase(item)),
      guide: refundGuide,
      demo: true,
      integrations: {
        storage: this.storage.mode(),
        queue: this.config.get('SUPPORT_SQS_URL') ? 'sqs' : 'local',
        automation: Boolean(this.config.get('N8N_REFUND_WEBHOOK_URL')),
        simulationEnabled: this.config.get('SUPPORT_DEMO_ENABLED', 'true') === 'true',
      },
    };
  }

  @Post('cases')
  create(
    @Headers('x-support-session') token: string,
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.support.create(this.support.session(token), key, dto);
  }

  @Post('cases/:id/merchant')
  merchant(@Headers('x-support-session') token: string, @Param('id') id: string) {
    return this.support.confirmMerchant(id, this.support.session(token));
  }

  @Post('cases/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } }),
  )
  async upload(
    @Headers('x-support-session') token: string,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const session = this.support.session(token);
    const item = this.support.owned(id, session);
    if (item.status !== 'waiting_receipt') {
      throw new ConflictException('Este atendimento não está aguardando um comprovante.');
    }
    const attachment = await this.storage.save(id, file);
    try {
      return this.support.attach(id, session, attachment);
    } catch (error) {
      await this.storage.remove(attachment);
      throw error;
    }
  }

  @Get('cases/:id/attachments/:attachmentId')
  async download(
    @Headers('x-support-session') token: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() response: Response,
  ) {
    const item = this.support.owned(id, this.support.session(token));
    const file = item.attachments.find((attachment) => attachment.id === attachmentId);
    if (!file) {
      throw new NotFoundException();
    }
    const result = await this.storage.download(file);
    response.setHeader('Cache-Control', 'no-store');
    if (result.url) {
      return response.redirect(result.url);
    }
    response.setHeader('Content-Type', file.type);
    response.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    response.send(result.bytes);
  }

  @Post('cases/:id/advice')
  async advice(
    @Headers('x-support-session') token: string,
    @Param('id') id: string,
    @Body() dto: SupportQuestionDto,
  ) {
    const item = this.support.owned(id, this.support.session(token));
    const { text, sources } = await this.chat.reply(
      { messages: [...(dto.history ?? []), { role: 'user', content: dto.question }] },
      undefined,
      supportContext(item),
    );
    return { text, sources };
  }

  @Post('cases/:id/simulate')
  simulate(@Headers('x-support-session') token: string, @Param('id') id: string) {
    return this.support.simulateCompletion(id, this.support.session(token));
  }

  @Post('automation/:id')
  callback(
    @Headers('x-automation-token') token: string,
    @Param('id') id: string,
    @Body() dto: AutomationCallbackDto,
  ) {
    this.support.verifyAutomation(token);
    return this.support.completeTriage(id, dto.eventId);
  }
}
