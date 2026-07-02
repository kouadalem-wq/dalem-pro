// src/payments/dto/create-payment.dto.ts

import { IsInt, Min, IsEnum, IsOptional, IsString } from 'class-validator';

export enum PaymentMethodDto {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export class CreatePaymentDto {
  // Montant en centimes — un paiement partiel est autorisé
  @IsInt()
  @Min(1, { message: 'Le montant doit être supérieur à 0.' })
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethodDto)
  method?: PaymentMethodDto;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
