// src/invoices/invoices.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private pdfService: PdfService,
    private mailService: MailService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const invoices = await this.invoicesService.findAll(user.tenantId);
    return { success: true, data: invoices };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const invoice = await this.invoicesService.findOne(user.tenantId, id);
    return { success: true, data: invoice };
  }

  @Patch(':id/payment-method')
  async updatePaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    const invoice = await this.invoicesService.updatePaymentMethod(
      user.tenantId,
      id,
      dto.paymentMethod,
    );
    return { success: true, data: invoice };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Seul un administrateur peut supprimer une facture.',
      );
    }
    const result = await this.invoicesService.remove(user.tenantId, id);
    return { success: true, data: result };
  }

  @Get(':id/pdf')
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(user.tenantId, id);
    const pdfBuffer = await this.buildPdf(invoice);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  // POST /invoices/:id/send-email — génère le PDF et l'envoie par email au client
  @Post(':id/send-email')
  async sendByEmail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const invoice = await this.invoicesService.findOne(user.tenantId, id);
    if (!invoice.client.email) {
      throw new BadRequestException("Ce client n'a pas d'adresse email enregistrée.");
    }
    const pdfBuffer = await this.buildPdf(invoice);
    await this.mailService.sendDocument({
      clientEmail: invoice.client.email,
      clientName: invoice.client.name,
      tenantName: invoice.tenant.name,
      documentType: 'facture',
      number: invoice.number,
      amount: this.formatMoney(invoice.totalAmount, invoice.currency),
      pdfBuffer,
    });
    return { success: true, message: `Facture envoyée à ${invoice.client.email}.` };
  }

  private async buildPdf(invoice: any): Promise<Buffer> {
   
    return this.pdfService.generateDocument({
      type: 'FACTURE',
      number: invoice.number,
      publicToken: invoice.publicToken,
      currency: invoice.currency,
      tenantName: invoice.tenant.name,
      tenantLogoUrl: invoice.tenant.logo,
      tenantSignatureUrl: invoice.tenant.signature,
      template: invoice.tenant.pdfTemplate,
      paymentMethod: invoice.paymentMethod,
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      clientPhone: invoice.client.phone,
      lines: invoice.lines,
      subtotalAmount: invoice.subtotalAmount,
      taxAmount: invoice.taxAmount,
      taxRate: Number(invoice.taxRate),
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
    });
  }
  private formatMoney(cents: number, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(amount).replace(/[\u00A0\u202F]/g, ' ');
  }
}