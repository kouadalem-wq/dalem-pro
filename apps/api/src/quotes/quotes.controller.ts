// src/quotes/quotes.controller.ts

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
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { QuotesService } from './quotes.service';
import { PdfService } from '../pdf/pdf.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(
    private quotesService: QuotesService,
    private pdfService: PdfService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuoteDto) {
    const quote = await this.quotesService.create(user.tenantId, dto);
    return { success: true, data: quote };
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const quotes = await this.quotesService.findAll(user.tenantId);
    return { success: true, data: quotes };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const quote = await this.quotesService.findOne(user.tenantId, id);
    return { success: true, data: quote };
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    const quote = await this.quotesService.updateStatus(user.tenantId, id, dto);
    return { success: true, data: quote };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    const quote = await this.quotesService.update(user.tenantId, id, dto);
    return { success: true, data: quote };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Seul un administrateur peut supprimer un devis.',
      );
    }
    const result = await this.quotesService.remove(user.tenantId, id);
    return { success: true, data: result };
  }

  @Post(':id/convert-to-invoice')
  async convertToInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const invoice = await this.quotesService.convertToInvoice(user.tenantId, id);
    return { success: true, data: invoice };
  }

  // GET /quotes/:id/pdf — télécharge le devis en PDF
  @Get(':id/pdf')
  async downloadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOne(user.tenantId, id);

    const pdfBuffer = await this.pdfService.generateDocument({
      type: 'DEVIS',
      number: quote.number,
      currency: quote.currency,
      tenantName: quote.tenant.name,
      tenantLogoUrl: quote.tenant.logo,
      template: quote.tenant.pdfTemplate,
      clientName: quote.client.name,
      clientEmail: quote.client.email,
      clientPhone: quote.client.phone,
      lines: quote.lines,
      subtotalAmount: quote.subtotalAmount,
      taxAmount: quote.taxAmount,
      taxRate: Number(quote.taxRate),
      totalAmount: quote.totalAmount,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.number}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }
}