// src/quotes/dto/update-quote.dto.ts
// Modification d'un devis existant : on remplace l'integralite des lignes
// (plus simple et plus sur qu'un diff ligne par ligne).
// Le client peut aussi etre change tant que le devis est modifiable.

import {
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuoteLineDto } from './quote-line.dto';

export class UpdateQuoteDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100, { message: 'Le taux de taxe doit etre entre 0 et 100.' })
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

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Le devis doit contenir au moins une ligne.' })
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines?: QuoteLineDto[];
}
