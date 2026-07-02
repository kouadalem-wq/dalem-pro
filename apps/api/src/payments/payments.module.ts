// src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule], // pour réutiliser InvoicesService.findOne()
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
