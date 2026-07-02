// src/quotes/quotes.module.ts

import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [PdfModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
