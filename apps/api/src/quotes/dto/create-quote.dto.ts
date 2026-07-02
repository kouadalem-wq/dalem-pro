// src/quotes/dto/create-quote.dto.ts

import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuoteLineDto } from './quote-line.dto';

export class CreateQuoteDto {
  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100, { message: 'Le taux de taxe doit être entre 0 et 100.' })
  taxRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Le devis doit contenir au moins une ligne.' })
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines: QuoteLineDto[];
}
