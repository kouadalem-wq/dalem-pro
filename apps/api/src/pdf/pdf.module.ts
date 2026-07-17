import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { QrCodeService } from '../common/qrcode.service';

@Module({
  providers: [PdfService, QrCodeService],
  exports: [PdfService],
})
export class PdfModule {}