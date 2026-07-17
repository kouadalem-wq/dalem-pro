// src/dashboard/dashboard.service.ts
// Agrège les données financières clés pour la vue d'ensemble de l'entreprise.

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
      // Revenu réellement encaissé (factures payées + partielles)
      this.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['PAID', 'PARTIAL'] } },
        _sum: { paidAmount: true },
      }),
      // Montant total encore dû
      this.prisma.invoice.aggregate({
        where: { tenantId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.invoice.count({ where: { tenantId, status: 'OVERDUE' } }),
      this.prisma.expense.aggregate({ where: { tenantId }, _sum: { amount: true } }),
      this.prisma.client.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
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
      expenses: { total: totalExpenses._sum.amount ?? 0 },
      netProfit:
        (totalRevenuePaid._sum.paidAmount ?? 0) - (totalExpenses._sum.amount ?? 0),
      overdueInvoicesCount,
      clientsCount,
      productsCount,
      recentInvoices,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // LIGNE DE VIE : combien de jours l'entreprise peut-elle tenir ?
  //
  // Principe :
  //  1. Solde actuel      = solde de depart (saisi) + encaisse − depense
  //  2. Rythme de depense = moyenne quotidienne des 90 derniers jours
  //  3. Encaissements     = factures impayees, a leur date d'echeance
  //  4. On simule jour par jour sur 90 jours : le solde baisse du rythme
  //     de depense, et remonte a chaque facture encaissee.
  //  5. Le 1er jour ou le solde passe sous zero = fin d'autonomie.
  // ────────────────────────────────────────────────────────────────
  async getLifeline(tenantId: string) {
    const HORIZON = 90;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const depuis90j = new Date(today);
    depuis90j.setDate(depuis90j.getDate() - 90);

    const debut6mois = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    const [tenant, encaisse, depense, depenses90j, facturesImpayees, paiements6mois, depenses6mois] =
      await Promise.all([
        // 0. Le solde de depart saisi par l'entreprise (argent disponible debut activite)
        this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { soldeInitial: true },
        }),
        // 1. Tout ce qui a ete encaisse (Payment via la relation invoice)
        this.prisma.payment.aggregate({
          where: { invoice: { tenantId } },
          _sum: { amount: true },
        }),
        // 2. Tout ce qui a ete depense
        this.prisma.expense.aggregate({
          where: { tenantId },
          _sum: { amount: true },
        }),
        // 3. Depenses des 90 derniers jours (pour le rythme)
        this.prisma.expense.aggregate({
          where: { tenantId, date: { gte: depuis90j } },
          _sum: { amount: true },
        }),
        // 4. Factures encore dues, avec leur echeance
        this.prisma.invoice.findMany({
          where: {
            tenantId,
            status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
          },
          include: { client: true },
          orderBy: { dueDate: 'asc' },
        }),
        // 5. Encaissements des 6 derniers mois (via la relation invoice)
        this.prisma.payment.findMany({
          where: { invoice: { tenantId }, paidAt: { gte: debut6mois } },
          select: { amount: true, paidAt: true },
        }),
        // 6. Depenses des 6 derniers mois
        this.prisma.expense.findMany({
          where: { tenantId, date: { gte: debut6mois } },
          select: { amount: true, date: true },
        }),
      ]);

    const soldeDepart = tenant?.soldeInitial ?? 0;
    const totalEncaisse = encaisse._sum?.amount ?? 0;
    const totalDepense = depense._sum?.amount ?? 0;

    // Le solde reel tient compte de l'argent que l'entreprise avait deja
    // avant d'utiliser Dalem_Pro (sinon la jauge est faussement pessimiste).
    const soldeActuel = soldeDepart + totalEncaisse - totalDepense;

    // Rythme de depense quotidien (moyenne sur 90 jours)
    const rythmeQuotidien = Math.round((depenses90j._sum?.amount ?? 0) / 90);

    // Les encaissements attendus : reste du, positionne a l'echeance.
    // Une facture sans echeance (ou deja echue) est placee a J+7 :
    // on suppose une relance et un paiement sous une semaine.
    const evenements = facturesImpayees
      .map((f) => {
        const reste = f.totalAmount - f.paidAmount;
        if (reste <= 0) return null;

        let jour = 7;
        if (f.dueDate) {
          const diff = Math.ceil(
            (new Date(f.dueDate).setHours(0, 0, 0, 0) - today.getTime()) / 86400000,
          );
          jour = diff > 0 ? diff : 7; // echeance passee → relance a J+7
        }

        return {
          jour,
          montant: reste,
          libelle: `${f.client?.name ?? 'Client'} doit te payer`,
          reference: f.number ?? null,
          enRetard: f.status === 'OVERDUE',
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => a.jour - b.jour);

    // Simulation jour par jour
    const courbe: number[] = [];
    let solde = soldeActuel;
    let jourRupture: number | null = null;

    for (let j = 0; j <= HORIZON; j++) {
      solde -= rythmeQuotidien;
      for (const e of evenements) {
        if (e.jour === j) solde += e.montant;
      }
      courbe.push(solde);
      if (jourRupture === null && solde < 0) jourRupture = j;
    }

    let dateRupture: string | null = null;
    if (jourRupture !== null) {
      const d = new Date(today);
      d.setDate(d.getDate() + jourRupture);
      dateRupture = d.toISOString();
    }

    // Evolution mensuelle sur 6 mois
    const mois: { cle: string; label: string; encaisse: number; depense: number }[] = [];
    const NOMS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin',
                  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      mois.push({
        cle: `${d.getFullYear()}-${d.getMonth()}`,
        label: NOMS[d.getMonth()],
        encaisse: 0,
        depense: 0,
      });
    }
    const index = new Map(mois.map((m) => [m.cle, m]));

    for (const p of paiements6mois) {
      const d = new Date(p.paidAt);
      const m = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.encaisse += p.amount;
    }
    for (const e of depenses6mois) {
      const d = new Date(e.date);
      const m = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.depense += e.amount;
    }

    return {
      soldeActuel,
      rythmeQuotidien,
      joursAutonomie: jourRupture,
      dateRupture,
      horizon: HORIZON,
      aEncaisser: evenements.reduce((s, e) => s + e.montant, 0),
      nbFacturesDues: evenements.length,
      prochainsEvenements: evenements.slice(0, 6),
      courbe,
      evolution: mois.map(({ label, encaisse, depense }) => ({ label, encaisse, depense })),
    };
  }
}