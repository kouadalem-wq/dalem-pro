import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  /**
   * Génère un QR code en buffer PNG (utilisable directement par pdfkit).
   */
  async generatePng(data: string): Promise<Buffer> {
    return QRCode.toBuffer(data, {
      type: 'png',
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  }

  /** URL publique de vérification d'un document. */
  buildVerificationUrl(publicToken: string): string {
    const base = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    return `${base}/verifier/${publicToken}`;
  }
}