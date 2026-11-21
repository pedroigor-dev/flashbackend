import { Module } from '@nestjs/common';
import { SupportStore } from './support.store';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AttachmentStorage } from './attachment.storage';
import { SupportWorker } from './support.worker';

@Module({
  controllers: [SupportController],
  providers: [SupportStore, SupportService, AttachmentStorage, SupportWorker],
})
export class SupportModule {}
