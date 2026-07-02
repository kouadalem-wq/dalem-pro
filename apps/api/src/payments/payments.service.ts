// src/payments/payments.service.ts
// Chaque paiement enregistré met à jour automatiquement :
// - paidAmount de la facture (cumul de tous les paiements)
// - status : PARTIAL si paidAmount < total, PAID si paidAmount >= total

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private invoicesService: InvoicesService,
  ) {}

  async create(tenantId: string, invoiceId: string, dto: CreatePaymentDto) {
    // Vérifie que la facture appartient bien au tenant (lève 404 sinon)
    const invoice = await this.invoicesService.findOne(tenantId, invoiceId);

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException(
        'Impossible d\'enregistrer un paiement sur une facture annulée.',
      );
    }

    const remainingAmount = invoice.totalAmount - invoice.paidAmount;

    if (dto.amount > remainingAmount) {
      throw new BadRequestException(
        `Le montant dépasse le solde restant dû (${remainingAmount} centimes).`,
      );
    }

    // Transaction : création du paiement + mise à jour de la facture ensemble
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: dto.amount,
          currency: invoice.currency,
          method: dto.method ?? 'CASH',
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      const newPaidAmount = invoice.paidAmount + dto.amount;
      const isFullyPaid = newPaidAmount >= invoice.totalAmount;

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? 'PAID' : 'PARTIAL',
          paidAt: isFullyPaid ? new Date() : undefined,
        },
      });

      return payment;
    });
  }

  async findAllForInvoice(tenantId: string, invoiceId: string) {
    // Vérifie l'appartenance au tenant
    await this.invoicesService.findOne(tenantId, invoiceId);

    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: 'desc' },
    });
  }
}
