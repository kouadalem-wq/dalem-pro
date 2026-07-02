// src/assistant/dto/chat.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsArray()
  history?: ChatMessageDto[];
}
