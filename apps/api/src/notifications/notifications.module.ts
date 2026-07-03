// src/notifications/notifications.module.ts

import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailModule } from '../mail/mail.module';
import { AssistantModule } from '../assistant/assistant.module';

@Module({
  imports: [MailModule, AssistantModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}

