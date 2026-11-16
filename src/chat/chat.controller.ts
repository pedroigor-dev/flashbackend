import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ChatRequestDto } from './chat.dto';
import { ChatService } from './chat.service';
import type { Response } from 'express';

@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}
  @Get('health') health() { return { status:'ok', service:'flashbackend', ai:this.chat.status() }; }
  @Post('chat') async reply(@Body() dto: ChatRequestDto, @Res({passthrough:true}) response: Response) {
    const controller = new AbortController();
    const onClose = () => { if (!response.writableEnded) controller.abort(); };
    response.on('close',onClose);
    try { return await this.chat.reply(dto,controller.signal); }
    finally { response.off('close',onClose); }
  }
}
