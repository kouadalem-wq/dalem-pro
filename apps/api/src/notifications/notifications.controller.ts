// src/notifications/notifications.controller.ts

import { Controller, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // POST /notifications/check-overdue — déclenche manuellement la vérification
  // (utile pour tester sans attendre l'exécution automatique de 8h du matin)
  @Post('check-overdue')
  async checkOverdue() {
    const result = await this.notificationsService.checkOverdueInvoices();
    return { success: true, data: result };
  }
}
