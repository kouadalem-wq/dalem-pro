// src/pdf/pdf.service.ts
// Génère un PDF pour un devis ou une facture, selon le template choisi par l'entreprise
// Utilise pdfkit : léger, pas de navigateur headless nécessaire

import { Injectable } from '@nestjs/common';
// pdfkit n'a pas d'exports ES modules propres : import require nécessaire
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

type DocumentLine = {
  description: string;
  quantity: number | { toNumber: () => number };
  unitPrice: number;
  totalPrice: number;
};

type DocumentData = {
  type: 'DEVIS' | 'FACTURE';
  number: string;
  currency: string;
  tenantName: string;
  tenantLogoUrl?: string | null;
  template?: 'MODERN' | 'CLASSIC';
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  lines: DocumentLine[];
  subtotalAmount: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  paidAmount?: number;
  createdAt: Date;
  validUntil?: Date | null;
  dueDate?: Date | null;
};

@Injectable()
export class PdfService {
  private formatMoney(cents: number, currency: string): string {
    const amount = cents / 100;
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(amount);
    return formatted.replace(/[\u00A0\u202F]/g, ' ');
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date).replace(/[\u00A0\u202F]/g, ' ');
  }

  private async fetchLogo(url: string): Promise<Buffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  private quantityToString(quantity: number | { toNumber: () => number }): string {
    return typeof quantity === 'number' ? String(quantity) : String(quantity.toNumber());
  }

  async generateDocument(data: DocumentData): Promise<Buffer> {
    const logoBuffer = data.tenantLogoUrl ? await this.fetchLogo(data.tenantLogoUrl) : null;
    const template = data.template ?? 'MODERN';

    if (template === 'CLASSIC') {
      return this.generateClassic(data, logoBuffer);
    }
    return this.generateModern(data, logoBuffer);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE MODERNE — bandeau vert, couleurs de marque
  // ═══════════════════════════════════════════════════════════════════════
  private generateModern(data: DocumentData, logoBuffer: Buffer | null): Promise<Buffer> {
    const emerald = '#0d9165';
    const coral = '#f2634a';
    const ink = '#0a0f0d';
    const gray = '#6b7280';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.rect(0, 0, 595, 8).fill(emerald);

      let headerTextX = 50;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 40, { fit: [50, 50] });
          headerTextX = 112;
        } catch {}
      }

      doc.fontSize(18).fillColor(ink).font('Helvetica-Bold').text(data.tenantName, headerTextX, 50, { width: 280 });
      doc.fontSize(26).fillColor(emerald).font('Helvetica-Bold').text(data.type, headerTextX, logoBuffer ? 78 : 82);

      const metaY = logoBuffer ? 112 : 116;
      doc.fontSize(10).fillColor(gray).font('Helvetica')
        .text(`N° ${data.number}`, headerTextX, metaY)
        .text(`Date : ${this.formatDate(data.createdAt)}`, headerTextX, metaY + 15);

      if (data.type === 'DEVIS' && data.validUntil) {
        doc.text(`Valable jusqu'au : ${this.formatDate(data.validUntil)}`, headerTextX, metaY + 30);
      }
      if (data.type === 'FACTURE' && data.dueDate) {
        doc.text(`Échéance : ${this.formatDate(data.dueDate)}`, headerTextX, metaY + 30);
      }

      doc.fontSize(9).fillColor(gray).font('Helvetica-Bold').text('FACTURÉ À', 350, 50);
      doc.fontSize(12).fillColor(ink).font('Helvetica-Bold').text(data.clientName, 350, 65);
      doc.fontSize(10).fillColor(gray).font('Helvetica');
      let clientY = 84;
      if (data.clientEmail) { doc.text(data.clientEmail, 350, clientY); clientY += 14; }
      if (data.clientPhone) { doc.text(data.clientPhone, 350, clientY); }

      const tableTop = 200;
      doc.rect(50, tableTop - 8, 495, 24).fill('#f4f7f4');
      doc.fontSize(9).fillColor(gray).font('Helvetica-Bold')
        .text('DESCRIPTION', 60, tableTop - 2)
        .text('QTÉ', 320, tableTop - 2, { width: 50, align: 'right' })
        .text('PRIX UNIT.', 380, tableTop - 2, { width: 80, align: 'right' })
        .text('TOTAL', 465, tableTop - 2, { width: 80, align: 'right' });

      let rowY = tableTop + 26;
      doc.font('Helvetica').fontSize(10).fillColor(ink);
      for (const line of data.lines) {
        doc.text(line.description, 60, rowY, { width: 250 })
          .text(this.quantityToString(line.quantity), 320, rowY, { width: 50, align: 'right' })
          .text(this.formatMoney(line.unitPrice, data.currency), 380, rowY, { width: 80, align: 'right' })
          .text(this.formatMoney(line.totalPrice, data.currency), 465, rowY, { width: 80, align: 'right' });
        rowY += 22;
        doc.moveTo(50, rowY - 6).lineTo(545, rowY - 6).strokeColor('#f0f0f0').lineWidth(0.5).stroke();
      }

      let totalsY = rowY + 14;
      doc.fontSize(10).fillColor(gray).font('Helvetica').text('Sous-total', 350, totalsY, { width: 110, align: 'right' });
      doc.fillColor(ink).text(this.formatMoney(data.subtotalAmount, data.currency), 460, totalsY, { width: 85, align: 'right' });

      totalsY += 18;
      doc.fillColor(gray).text(`Taxe (${data.taxRate}%)`, 350, totalsY, { width: 110, align: 'right' });
      doc.fillColor(ink).text(this.formatMoney(data.taxAmount, data.currency), 460, totalsY, { width: 85, align: 'right' });

      totalsY += 22;
      doc.moveTo(350, totalsY - 4).lineTo(545, totalsY - 4).strokeColor(emerald).lineWidth(1).stroke();
      doc.fontSize(13).fillColor(emerald).font('Helvetica-Bold')
        .text('TOTAL', 350, totalsY, { width: 110, align: 'right' })
        .text(this.formatMoney(data.totalAmount, data.currency), 350, totalsY + 18, { width: 195, align: 'right' });

      if (data.type === 'FACTURE' && data.paidAmount !== undefined) {
        const remaining = data.totalAmount - data.paidAmount;
        const boxY = totalsY + 55;
        doc.roundedRect(50, boxY, 230, 68, 6).fillAndStroke('#f4f7f4', '#e5e7eb');
        doc.fontSize(8).fillColor(gray).font('Helvetica-Bold').text('STATUT DU PAIEMENT', 64, boxY + 12);
        doc.fontSize(9).font('Helvetica').fillColor(gray).text('Déjà payé', 64, boxY + 30, { width: 100 });
        doc.fillColor(ink).font('Helvetica-Bold').text(this.formatMoney(data.paidAmount, data.currency), 64, boxY + 30, { width: 202, align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor(gray).text('Solde restant', 64, boxY + 47, { width: 100 });
        doc.fillColor(remaining > 0 ? coral : emerald).font('Helvetica-Bold')
          .text(this.formatMoney(remaining, data.currency), 64, boxY + 47, { width: 202, align: 'right' });
      }

      doc.fontSize(8).fillColor(gray).font('Helvetica')
        .text(`Document généré par Dalem_Pro — ${data.tenantName}`, 50, 780, { width: 495, align: 'center' });

      doc.end();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEMPLATE CLASSIQUE — noir et blanc, sobre, police Times-Roman
  // ═══════════════════════════════════════════════════════════════════════
  private generateClassic(data: DocumentData, logoBuffer: Buffer | null): Promise<Buffer> {
    const black = '#000000';
    const darkGray = '#333333';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let headerTextX = 50;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 50, { fit: [45, 45] });
          headerTextX = 105;
        } catch {}
      }

      doc.fontSize(16).fillColor(black).font('Times-Bold').text(data.tenantName, headerTextX, 50);
      doc.moveTo(50, 100).lineTo(545, 100).strokeColor(black).lineWidth(1).stroke();

      doc.fontSize(20).fillColor(black).font('Times-Bold').text(data.type, 50, 115);
      doc.fontSize(10).fillColor(darkGray).font('Times-Roman')
        .text(`N° ${data.number}`, 50, 145)
        .text(`Date : ${this.formatDate(data.createdAt)}`, 50, 158);

      if (data.type === 'DEVIS' && data.validUntil) {
        doc.text(`Valable jusqu'au : ${this.formatDate(data.validUntil)}`, 50, 171);
      }
      if (data.type === 'FACTURE' && data.dueDate) {
        doc.text(`Échéance : ${this.formatDate(data.dueDate)}`, 50, 171);
      }

      doc.fontSize(9).fillColor(darkGray).font('Times-Bold').text('Facturé à :', 350, 115);
      doc.fontSize(11).fillColor(black).font('Times-Bold').text(data.clientName, 350, 130);
      doc.fontSize(10).fillColor(darkGray).font('Times-Roman');
      let clientY = 147;
      if (data.clientEmail) { doc.text(data.clientEmail, 350, clientY); clientY += 13; }
      if (data.clientPhone) { doc.text(data.clientPhone, 350, clientY); }

      const tableTop = 210;
      doc.moveTo(50, tableTop).lineTo(545, tableTop).strokeColor(black).lineWidth(1).stroke();
      doc.fontSize(9).fillColor(black).font('Times-Bold')
        .text('DESCRIPTION', 50, tableTop + 6)
        .text('QTÉ', 320, tableTop + 6, { width: 50, align: 'right' })
        .text('PRIX UNIT.', 380, tableTop + 6, { width: 80, align: 'right' })
        .text('TOTAL', 465, tableTop + 6, { width: 80, align: 'right' });
      doc.moveTo(50, tableTop + 22).lineTo(545, tableTop + 22).strokeColor(black).lineWidth(0.5).stroke();

      let rowY = tableTop + 32;
      doc.font('Times-Roman').fontSize(10).fillColor(black);
      for (const line of data.lines) {
        doc.text(line.description, 50, rowY, { width: 260 })
          .text(this.quantityToString(line.quantity), 320, rowY, { width: 50, align: 'right' })
          .text(this.formatMoney(line.unitPrice, data.currency), 380, rowY, { width: 80, align: 'right' })
          .text(this.formatMoney(line.totalPrice, data.currency), 465, rowY, { width: 80, align: 'right' });
        rowY += 20;
      }
      doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor(black).lineWidth(1).stroke();

      let totalsY = rowY + 14;
      doc.fontSize(10).fillColor(darkGray).font('Times-Roman').text('Sous-total', 350, totalsY, { width: 110, align: 'right' });
      doc.fillColor(black).text(this.formatMoney(data.subtotalAmount, data.currency), 460, totalsY, { width: 85, align: 'right' });

      totalsY += 16;
      doc.fillColor(darkGray).text(`Taxe (${data.taxRate}%)`, 350, totalsY, { width: 110, align: 'right' });
      doc.fillColor(black).text(this.formatMoney(data.taxAmount, data.currency), 460, totalsY, { width: 85, align: 'right' });

      totalsY += 20;
      doc.moveTo(350, totalsY - 4).lineTo(545, totalsY - 4).strokeColor(black).lineWidth(1).stroke();
      doc.fontSize(13).fillColor(black).font('Times-Bold')
        .text('TOTAL', 350, totalsY, { width: 110, align: 'right' })
        .text(this.formatMoney(data.totalAmount, data.currency), 350, totalsY + 18, { width: 195, align: 'right' });

      if (data.type === 'FACTURE' && data.paidAmount !== undefined) {
        const remaining = data.totalAmount - data.paidAmount;
        const boxY = totalsY + 55;
        doc.rect(50, boxY, 230, 66).strokeColor(black).lineWidth(0.5).stroke();
        doc.fontSize(8).fillColor(black).font('Times-Bold').text('STATUT DU PAIEMENT', 60, boxY + 10);
        doc.fontSize(9).font('Times-Roman').fillColor(darkGray).text('Déjà payé', 60, boxY + 28, { width: 100 });
        doc.fillColor(black).font('Times-Bold').text(this.formatMoney(data.paidAmount, data.currency), 60, boxY + 28, { width: 200, align: 'right' });
        doc.fontSize(9).font('Times-Roman').fillColor(darkGray).text('Solde restant', 60, boxY + 45, { width: 100 });
        doc.fillColor(black).font('Times-Bold')
          .text(this.formatMoney(remaining, data.currency), 60, boxY + 45, { width: 200, align: 'right' });
      }

      doc.fontSize(8).fillColor(darkGray).font('Times-Roman')
        .text(data.tenantName, 50, 780, { width: 495, align: 'center' });

      doc.end();
    });
  }
}
