// src/payments/payments.controller.ts
// Routes imbriquées sous /invoices/:invoiceId/payments
// (un paiement n'existe jamais sans facture parente)

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('invoices/:invoiceId/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    const payment = await this.paymentsService.create(user.tenantId, invoiceId, dto);
    return { success: true, data: payment };
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser, @Param('invoiceId') invoiceId: string) {
    const payments = await this.paymentsService.findAllForInvoice(user.tenantId, invoiceId);
    return { success: true, data: payments };
  }
}
