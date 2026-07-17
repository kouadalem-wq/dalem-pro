// src/verification/verification.service.ts
// Verification publique d'un document via son publicToken.
// N'expose QUE des informations non sensibles (pas de notes internes,
// pas de coordonnees client, pas de detail des lignes).

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async verify(token: string) {
    // On cherche d'abord dans les factures
    const invoice = await this.prisma.invoice.findUnique({
      where: { publicToken: token },
      include: { client: true, tenant: true },
    });

    if (invoice) {
      return this.format('FACTURE', invoice);
    }

    // Puis dans les devis
    const quote = await this.prisma.quote.findUnique({
      where: { publicToken: token },
      include: { client: true, tenant: true },
    });

    if (quote) {
      return this.format('DEVIS', quote);
    }

    // Aucun document ne correspond a ce token
    throw new NotFoundException('Document introuvable.');
  }

  // Ne renvoie que le strict necessaire pour prouver l'authenticite
  private format(type: 'FACTURE' | 'DEVIS', doc: any) {
    return {
      authentique: true,
      type,
      numero: doc.number,
      date: doc.createdAt,
      montantTotal: doc.totalAmount,
      devise: doc.currency,
      entreprise: doc.tenant?.name ?? null,
      client: doc.client?.name ?? null,
      statut: doc.status,
    };
  }
}