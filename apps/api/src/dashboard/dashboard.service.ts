// src/dashboard/dashboard.service.ts
// Agrège les données financières clés pour la vue d'ensemble de l'entreprise

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const [
      totalRevenuePaid,
      totalOutstanding,
      overdueInvoicesCount,
      totalExpenses,
      clientsCount,
      productsCount,
      recentInvoices,
    ] = await Promise.all([
      // Revenu réellement encaissé (somme des factures payées + partielles)
      this.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['PAID', 'PARTIAL'] } },
        _sum: { paidAmount: true },
      }),

      // Montant total encore dû (factures non entièrement payées)
      this.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Nombre de factures en retard
      this.prisma.invoice.count({
        where: { tenantId, status: 'OVERDUE' },
      }),

      // Total des dépenses
      this.prisma.expense.aggregate({
        where: { tenantId },
        _sum: { amount: true },
      }),

      this.prisma.client.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),

      // Les 5 factures les plus récentes
      this.prisma.invoice.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: true },
      }),
    ]);

    const totalDue =
      (totalOutstanding._sum.totalAmount ?? 0) -
      (totalOutstanding._sum.paidAmount ?? 0);

    return {
      revenue: {
        totalPaid: totalRevenuePaid._sum.paidAmount ?? 0,
        totalDue,
      },
      expenses: {
        total: totalExpenses._sum.amount ?? 0,
      },
      netProfit: (totalRevenuePaid._sum.paidAmount ?? 0) - (totalExpenses._sum.amount ?? 0),
      overdueInvoicesCount,
      clientsCount,
      productsCount,
      recentInvoices,
    };
  }
}
