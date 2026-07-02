// src/quotes/quotes.service.ts
// Le calcul des totaux se fait TOUJOURS cote serveur, jamais cote client.
// Un utilisateur malveillant pourrait sinon falsifier les montants envoyes.
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { QuoteLineDto } from './dto/quote-line.dto';

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

  // Resout les lignes : recupere les prix des produits references,
  // valide les lignes libres, calcule les totaux de ligne.
  private async resolveLines(tenantId: string, lines: QuoteLineDto[]) {
    const resolvedLines: {
      productId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];

    for (const line of lines) {
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

    return resolvedLines;
  }

  private computeTotals(
    resolvedLines: { totalPrice: number }[],
    taxRate: number,
  ) {
    const subtotalAmount = resolvedLines.reduce((sum, l) => sum + l.totalPrice, 0);
    const taxAmount = Math.round(subtotalAmount * (taxRate / 100));
    const totalAmount = subtotalAmount + taxAmount;

    // Garde-fou remises : un devis ne peut pas avoir un total negatif
    if (subtotalAmount < 0 || totalAmount < 0) {
      throw new BadRequestException(
        'Le total du devis ne peut pas etre negatif. Verifie les remises.',
      );
    }

    return { subtotalAmount, taxAmount, totalAmount };
  }

  async create(tenantId: string, dto: CreateQuoteDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new BadRequestException('Client introuvable pour cette entreprise.');
    }

    const resolvedLines = await this.resolveLines(tenantId, dto.lines);
    const taxRate = dto.taxRate ?? 0;
    const { subtotalAmount, taxAmount, totalAmount } = this.computeTotals(
      resolvedLines,
      taxRate,
    );

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

  // Modification d'un devis : uniquement DRAFT ou SENT, jamais converti.
  // Les lignes sont remplacees integralement dans une transaction.
  async update(tenantId: string, id: string, dto: UpdateQuoteDto) {
    const quote = await this.findOne(tenantId, id);

    if (quote.convertedToInvoiceId) {
      throw new BadRequestException(
        'Ce devis a deja ete converti en facture et ne peut plus etre modifie.',
      );
    }
    if (quote.status !== 'DRAFT' && quote.status !== 'SENT') {
      throw new BadRequestException(
        'Seul un devis en brouillon ou envoye peut etre modifie.',
      );
    }

    // Changement de client (autorise tant que le devis est modifiable)
    let clientId = quote.clientId;
    if (dto.clientId && dto.clientId !== quote.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });
      if (!client) {
        throw new BadRequestException('Client introuvable pour cette entreprise.');
      }
      clientId = dto.clientId;
    }

    const taxRate = dto.taxRate ?? Number(quote.taxRate);

    // Si les lignes ne changent pas, on repart des lignes existantes
    const lineInputs: QuoteLineDto[] =
      dto.lines ??
      quote.lines.map((l) => ({
        productId: l.productId ?? undefined,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: l.unitPrice,
      }));

    const resolvedLines = await this.resolveLines(tenantId, lineInputs);
    const { subtotalAmount, taxAmount, totalAmount } = this.computeTotals(
      resolvedLines,
      taxRate,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.quoteLine.deleteMany({ where: { quoteId: quote.id } });

      return tx.quote.update({
        where: { id: quote.id },
        data: {
          clientId,
          taxRate,
          subtotalAmount,
          taxAmount,
          totalAmount,
          notes: dto.notes !== undefined ? dto.notes : quote.notes,
          internalNotes:
            dto.internalNotes !== undefined
              ? dto.internalNotes
              : quote.internalNotes,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : quote.validUntil,
          lines: {
            create: resolvedLines,
          },
        },
        include: { lines: true, client: true },
      });
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateQuoteStatusDto) {
    const quote = await this.findOne(tenantId, id);

    if (quote.status === 'ACCEPTED' && dto.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Un devis deja accepte ne peut plus changer de statut. Creez un nouveau devis si necessaire.',
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
        'Seul un devis accepte peut etre converti en facture.',
      );
    }

    if (quote.convertedToInvoiceId) {
      throw new BadRequestException('Ce devis a deja ete converti en facture.');
    }

    const year = new Date().getFullYear();
    const invoiceCount = await this.prisma.invoice.count({
      where: { tenantId, number: { startsWith: `FAC-${year}-` } },
    });
    const invoiceNumber = `FAC-${year}-${String(invoiceCount + 1).padStart(3, '0')}`;

    const invoice = await this.prisma.$transaction(async (tx) => {
      // Echeance par defaut : 30 jours apres la creation de la facture
      // (necessaire pour que le systeme de rappels de retard puisse fonctionner)
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
