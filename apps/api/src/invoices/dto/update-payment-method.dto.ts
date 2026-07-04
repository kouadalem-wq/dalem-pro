// src/invoices/dto/update-payment-method.dto.ts
import { IsEnum } from 'class-validator';

export enum PaymentMethodDto {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export class UpdatePaymentMethodDto {
  @IsEnum(PaymentMethodDto, {
    message: 'Moyen de reglement invalide.',
  })
  paymentMethod: PaymentMethodDto;
}
