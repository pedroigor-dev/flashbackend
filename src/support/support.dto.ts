import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ChatMessageDto } from '../chat/chat.dto';

export class CreateRefundDto {
  @IsIn(['tx-market', 'tx-delivery', 'tx-cafe'])
  transactionId: string;

  @IsIn(['cancelled', 'duplicate', 'declined'])
  reason: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsBoolean()
  merchantConfirmed: boolean;
}

export class AutomationCallbackDto {
  @IsUUID()
  eventId: string;
}

export class SupportQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  question: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}
