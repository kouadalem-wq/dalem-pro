// src/quotes/quotes.service.ts
// Le calcul des totaux se fait TOUJOURS côté serveur, jamais côté client.
// Un utilisateur malveillant pourrait sinon falsifier les montants envoyés.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.quote.count({
      where: {
        tenantId,
        number: { startsWith: `DEV-${year}-` },
      },
    });
    const nextNumber = String(count + 1).padStart(3, '0');
    return `DEV-${year}-${nextNumber}`;
  }

  async create(tenantId: string, dto: CreateQuoteDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new BadRequestException('Client introuvable pour cette entreprise.');
    }

    const resolvedLines: {
      productId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const line of dto.lines) {
      let unitPrice: number;
      let description = line.description;

      if (line.productId) {
        const product = await this.prisma.product.findFirst({
          where: { id: line.productId, tenantId },
        });
        if (!product) {
          throw new BadRequestException(
            `Produit introuvable : ${line.productId}.`,
          );
        }
        unitPrice = product.unitPrice;
        description = description || product.name;
      } else {
        if (line.unitPrice === undefined) {
          throw new BadRequestException(
            'unitPrice est requis pour une ligne sans productId.',
          );
        }
        unitPrice = Math.round(line.unitPrice);
      }

      const totalPrice = Math.round(unitPrice * line.quantity);

      resolvedLines.push({
        productId: line.productId ?? null,
        description,
        quantity: line.quantity,
        unitPrice,
        totalPrice,
      });
    }

    const subtotalAmount = resolvedLines.reduce((sum, l) => sum + l.totalPrice, 0);
    const taxRate = dto.taxRate ?? 0;
    const taxAmount = Math.round(subtotalAmount * (taxRate / 100));
    const totalAmount = subtotalAmount + taxAmount;

    const number = await this.generateQuoteNumber(tenantId);

    return this.prisma.quote.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        number,
        currency: dto.currency ?? 'XOF',
        subtotalAmount,
        taxAmount,
        totalAmount,
        taxRate,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        lines: {
          create: resolvedLines,
        },
      },
      include: {
        lines: true,
        client: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.quote.findMany({
      where: { tenantId },
      include: { client: true, lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, tenantId },
      include: { client: true, lines: true, tenant: true },
    });

    if (!quote) {
      throw new NotFoundException('Devis introuvable.');
    }

    return quote;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateQuoteStatusDto) {
    const quote = await this.findOne(tenantId, id);

    if (quote.status === 'ACCEPTED' && dto.status !== 'ACCEPTED') {
      throw new BadRequestException(
        "Un devis déjà accepté ne peut plus changer de statut. Créez un nouveau devis si nécessaire.",
      );
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: dto.status },
      include: { lines: true, client: true },
    });
  }

  async convertToInvoice(tenantId: string, id: string) {
    const quote = await this.findOne(tenantId, id);

    if (quote.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Seul un devis accepté peut être converti en facture.',
      );
    }

    if (quote.convertedToInvoiceId) {
      throw new BadRequestException('Ce devis a déjà été converti en facture.');
    }

    const year = new Date().getFullYear();
    const invoiceCount = await this.prisma.invoice.count({
      where: { tenantId, number: { startsWith: `FAC-${year}-` } },
    });
    const invoiceNumber = `FAC-${year}-${String(invoiceCount + 1).padStart(3, '0')}`;

    const invoice = await this.prisma.$transaction(async (tx) => {
      // Échéance par défaut : 30 jours après la création de la facture
      // (nécessaire pour que le système de rappels de retard puisse fonctionner)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const newInvoice = await tx.invoice.create({
        data: {
          tenantId,
          clientId: quote.clientId,
          number: invoiceNumber,
          currency: quote.currency,
          subtotalAmount: quote.subtotalAmount,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          taxRate: quote.taxRate,
          notes: quote.notes,
          fromQuoteId: quote.id,
          status: 'SENT', // La conversion vaut envoi de la facture
          dueDate,
          lines: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.quote.update({
        where: { id: quote.id },
        data: { convertedToInvoiceId: newInvoice.id },
      });

      return newInvoice;
    });

    return invoice;
  }
}
