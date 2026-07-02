// src/quotes/dto/update-quote-status.dto.ts

import { IsEnum } from 'class-validator';

export enum QuoteStatusDto {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export class UpdateQuoteStatusDto {
  @IsEnum(QuoteStatusDto, {
    message: 'Statut invalide. Valeurs possibles : DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED.',
  })
  status: QuoteStatusDto;
}
