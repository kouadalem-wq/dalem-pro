// src/notifications/notifications.service.ts
// Verifie quotidiennement les factures dont l'echeance est depassee et non
// entierement payees : les marque OVERDUE et envoie un rappel au client.
// Le texte du rappel est redige par Dalem AI (ton adapte a l'historique du
// client). Si l'IA est indisponible (quota, panne), on retombe sur le
// template standard : une relance standard vaut mieux que pas de relance.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AssistantService } from '../assistant/assistant.service';

// Pause entre deux appels IA pour ne pas saturer le quota Groq (30 req/min)
const AI_CALL_DELAY_MS = 2500;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private assistantService: AssistantService,
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Tourne chaque jour a 8h - s'execute automatiquement, pas besoin d'intervention
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyOverdueCheck() {
    this.logger.log('Demarrage de la verification quotidienne des factures en retard...');
    await this.checkOverdueInvoices();
  }

  // Logique reutilisable - aussi appelable manuellement via l'endpoint de test
  async checkOverdueInvoices(): Promise<{ checked: number; markedOverdue: number; remindersSent: number; aiReminders: number }> {
    const now = new Date();

    // Factures dont l'echeance est passee, pas encore payees entierement,
    // et pas deja annulees
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ['SENT', 'PARTIAL'] },
      },
      include: { client: true, tenant: true },
    });

    let markedOverdue = 0;
    let remindersSent = 0;
    let aiReminders = 0;

    for (const invoice of overdueInvoices) {
      // Marque la facture comme en retard si ce n'est pas deja fait
      if (invoice.status !== 'OVERDUE') {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });
        markedOverdue++;
      }

      // Envoie un rappel uniquement si le client a un email enregistre
      if (invoice.client.email) {
        const sentWithAi = await this.sendReminderWithAiFallback(invoice);
        if (sentWithAi) aiReminders++;
        remindersSent++;
        // Espace les appels pour respecter le quota Groq
        await this.sleep(AI_CALL_DELAY_MS);
      } else {
        this.logger.warn(
          `Facture ${invoice.number} en retard, mais le client "${invoice.client.name}" n'a pas d'email enregistre.`,
        );
      }
    }

    this.logger.log(
      `Verification terminee : ${overdueInvoices.length} facture(s) examinee(s), ${markedOverdue} marquee(s) en retard, ${remindersSent} rappel(s) envoye(s) dont ${aiReminders} rediges par l'IA.`,
    );

    return {
      checked: overdueInvoices.length,
      markedOverdue,
      remindersSent,
      aiReminders,
    };
  }

  // Tente la redaction IA ; en cas d'echec, retombe sur le template standard.
  // Retourne true si le rappel envoye a ete redige par l'IA.
  private async sendReminderWithAiFallback(invoice: {
    id: string;
    number: string;
    currency: string;
    totalAmount: number;
    paidAmount: number;
    dueDate: Date | null;
    tenantId: string;
    client: { name: string; email: string | null };
    tenant: { name: string };
  }): Promise<boolean> {
    if (!invoice.client.email) return false;

    try {
      const { message, subject } = await this.assistantService.reminder(
        invoice.tenantId,
        invoice.id,
        'email',
      );
      await this.mailService.sendAiReminder({
        clientEmail: invoice.client.email,
        tenantName: invoice.tenant.name,
        subject,
        message,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Redaction IA indisponible pour ${invoice.number} (${(error as Error).message}). Envoi du template standard.`,
      );
      const remaining = invoice.totalAmount - invoice.paidAmount;
      await this.mailService.sendOverdueReminder({
        clientEmail: invoice.client.email,
        clientName: invoice.client.name,
        tenantName: invoice.tenant.name,
        invoiceNumber: invoice.number,
        amountDue: this.formatMoney(remaining, invoice.currency),
        dueDate: invoice.dueDate ? this.formatDate(invoice.dueDate) : 'Non definie',
      });
      return false;
    }
  }
}
