// src/notifications/notifications.service.ts
// Vérifie quotidiennement les factures dont l'échéance est dépassée et non
// entièrement payées : les marque OVERDUE et envoie un rappel au client.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private formatMoney(cents: number, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(amount).replace(/[\u00A0\u202F]/g, ' ');
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date).replace(/[\u00A0\u202F]/g, ' ');
  }

  // Tourne chaque jour à 8h — s'exécute automatiquement, pas besoin d'intervention
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyOverdueCheck() {
    this.logger.log('Démarrage de la vérification quotidienne des factures en retard...');
    await this.checkOverdueInvoices();
  }

  // Logique réutilisable — aussi appelable manuellement via l'endpoint de test
  async checkOverdueInvoices(): Promise<{ checked: number; markedOverdue: number; remindersSent: number }> {
    const now = new Date();

    // Factures dont l'échéance est passée, pas encore payées entièrement,
    // et pas déjà annulées
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['SENT', 'PARTIAL'] },
      },
      include: { client: true, tenant: true },
    });

    let markedOverdue = 0;
    let remindersSent = 0;

    for (const invoice of overdueInvoices) {
      // Marque la facture comme en retard si ce n'est pas déjà fait
      if (invoice.status !== 'OVERDUE') {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });
        markedOverdue++;
      }

      // Envoie un rappel uniquement si le client a un email enregistré
      if (invoice.client.email) {
        const remaining = invoice.totalAmount - invoice.paidAmount;
        await this.mailService.sendOverdueReminder({
          clientEmail: invoice.client.email,
          clientName: invoice.client.name,
          tenantName: invoice.tenant.name,
          invoiceNumber: invoice.number,
          amountDue: this.formatMoney(remaining, invoice.currency),
          dueDate: invoice.dueDate ? this.formatDate(invoice.dueDate) : 'Non définie',
        });
        remindersSent++;
      } else {
        this.logger.warn(
          `Facture ${invoice.number} en retard, mais le client "${invoice.client.name}" n'a pas d'email enregistré.`,
        );
      }
    }

    this.logger.log(
      `Vérification terminée : ${overdueInvoices.length} facture(s) examinée(s), ${markedOverdue} marquée(s) en retard, ${remindersSent} rappel(s) envoyé(s).`,
    );

    return {
      checked: overdueInvoices.length,
      markedOverdue,
      remindersSent,
    };
  }
}
