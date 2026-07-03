// src/mail/mail.service.ts
// Envoie des emails via SMTP. Si aucune configuration SMTP n'est fournie,
// le service se dégrade gracieusement : il affiche l'email dans les logs.

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type Attachment = { filename: string; content: Buffer };

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
      this.logger.log('Service email configuré (SMTP actif).');
    } else {
      this.logger.warn(
        'SMTP non configuré. Les emails seront affichés dans les logs au lieu d\'être envoyés.',
      );
    }
  }

  async send(to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void> {
    if (!this.transporter) {
      const attachmentInfo = attachments?.length
        ? ` | Pièce(s) jointe(s): ${attachments.map((a) => a.filename).join(', ')}`
        : '';
      this.logger.log(`[EMAIL SIMULÉ] À: ${to} | Sujet: ${subject}${attachmentInfo}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'Dalem_Pro <no-reply@dalempro.com>',
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`Email envoyé à ${to} : ${subject}`);
    } catch (error) {
      this.logger.error(`Échec de l'envoi de l'email à ${to} : ${(error as Error).message}`);
    }
  }

  async sendOverdueReminder(params: {
    clientEmail: string;
    clientName: string;
    tenantName: string;
    invoiceNumber: string;
    amountDue: string;
    dueDate: string;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0d9165;">Rappel de paiement</h2>
        <p>Bonjour ${params.clientName},</p>
        <p>
          Nous vous rappelons que la facture <strong>${params.invoiceNumber}</strong>
          émise par <strong>${params.tenantName}</strong> est en retard de paiement.
        </p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Montant dû</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${params.amountDue}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Date d'échéance</td>
            <td style="padding: 8px 0; text-align: right;">${params.dueDate}</td>
          </tr>
        </table>
        <p>Merci de bien vouloir régulariser cette situation dans les meilleurs délais.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Ceci est un message automatique envoyé par Dalem_Pro au nom de ${params.tenantName}.
        </p>
      </div>
    `;
    await this.send(params.clientEmail, `Rappel — Facture ${params.invoiceNumber} en retard de paiement`, html);
  }

  // Rappel de retard rédigé par Dalem AI : le texte est fourni tel quel,
  // on l'habille simplement dans le gabarit visuel maison.
  async sendAiReminder(params: {
    clientEmail: string;
    tenantName: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const paragraphs = params.message
      .split(/\n+/)
      .map((p) => `<p>${p.trim()}</p>`)
      .join('\n');
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0d9165;">Rappel de paiement</h2>
        ${paragraphs}
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Ceci est un message automatique envoyé par Dalem_Pro au nom de ${params.tenantName}.
        </p>
      </div>
    `;
    await this.send(params.clientEmail, params.subject, html);
  }

  // Email de facture/devis avec le PDF en pièce jointe
  async sendDocument(params: {
    clientEmail: string;
    clientName: string;
    tenantName: string;
    documentType: 'devis' | 'facture';
    number: string;
    amount: string;
    pdfBuffer: Buffer;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0d9165;">Votre ${params.documentType}</h2>
        <p>Bonjour ${params.clientName},</p>
        <p>
          Veuillez trouver ci-joint votre ${params.documentType} <strong>${params.number}</strong>
          de la part de <strong>${params.tenantName}</strong>, d'un montant de
          <strong>${params.amount}</strong>.
        </p>
        <p>N'hésitez pas à nous contacter pour toute question.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Ceci est un message envoyé par Dalem_Pro au nom de ${params.tenantName}.
        </p>
      </div>
    `;
    await this.send(
      params.clientEmail,
      `${params.documentType === 'facture' ? 'Facture' : 'Devis'} ${params.number} — ${params.tenantName}`,
      html,
      [{ filename: `${params.number}.pdf`, content: params.pdfBuffer }],
    );
  }

  // Email d'invitation employé — lien pour définir son mot de passe
  async sendEmployeeInvite(params: {
    email: string;
    firstName: string;
    tenantName: string;
    setPasswordUrl: string;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0d9165;">Bienvenue chez ${params.tenantName}</h2>
        <p>Bonjour ${params.firstName},</p>
        <p>
          Vous avez été invité(e) à rejoindre l'espace Dalem_Pro de
          <strong>${params.tenantName}</strong>.
        </p>
        <p>
          <a href="${params.setPasswordUrl}" style="display: inline-block; background: #0d9165; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 10px;">
            Définir mon mot de passe
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette invitation, ignorez cet email.
        </p>
      </div>
    `;
    await this.send(params.email, `Invitation à rejoindre ${params.tenantName} sur Dalem_Pro`, html);
  }

  // Email de réinitialisation de mot de passe
  async sendPasswordReset(params: {
    email: string;
    firstName: string;
    resetUrl: string;
  }): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0d9165;">Réinitialisation de mot de passe</h2>
        <p>Bonjour ${params.firstName},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe Dalem_Pro.</p>
        <p>
          <a href="${params.resetUrl}" style="display: inline-block; background: #0d9165; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 10px;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.
        </p>
      </div>
    `;
    await this.send(params.email, 'Réinitialisation de votre mot de passe Dalem_Pro', html);
  }
}