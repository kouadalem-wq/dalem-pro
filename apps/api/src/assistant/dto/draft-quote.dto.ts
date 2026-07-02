// src/assistant/dto/draft-quote.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class DraftQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}
