// src/assistant/assistant.module.ts
import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
