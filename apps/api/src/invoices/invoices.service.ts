// src/invoices/invoices.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      include: { client: true, lines: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { client: true, lines: true, payments: true, tenant: true },
    });
    if (!invoice) {
      throw new NotFoundException('Facture introuvable.');
    }
    return invoice;
  }

  // Met a jour le moyen de reglement souhaite (affiche sur le PDF)
  async updatePaymentMethod(tenantId: string, id: string, paymentMethod: string) {
    // Verifie que la facture appartient bien au tenant
    await this.findOne(tenantId, id);
    return this.prisma.invoice.update({
      where: { id },
      data: { paymentMethod: paymentMethod as any },
      include: { client: true, lines: true, payments: true },
    });
  }

  // Suppression d'une facture : interdite si un paiement a ete enregistre
  // (integrite comptable - dans ce cas, il faut l'annuler, pas la supprimer).
  // Le devis d'origine est detache pour pouvoir etre reconverti si besoin.
  async remove(tenantId: string, id: string) {
    const invoice = await this.findOne(tenantId, id);

    if (invoice.payments.length > 0 || invoice.paidAmount > 0) {
      throw new BadRequestException(
        'Cette facture a des paiements enregistres et ne peut pas etre supprimee. Annule-la plutot pour garder la trace comptable.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quote.updateMany({
        where: { tenantId, convertedToInvoiceId: invoice.id },
        data: { convertedToInvoiceId: null },
      });
      await tx.invoice.delete({ where: { id: invoice.id } });
    });

    return { deleted: true };
  }
}