// src/assistant/assistant.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatDto } from './dto/chat.dto';
import { DraftQuoteDto } from './dto/draft-quote.dto';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private assistantService: AssistantService) {}

  @Post('chat')
  async chat(@CurrentUser() user: AuthUser, @Body() dto: ChatDto) {
    const result = await this.assistantService.chat(
      user.tenantId,
      dto.message,
      dto.history,
    );
    return { success: true, data: result };
  }

  @Post('draft-quote')
  async draftQuote(@CurrentUser() user: AuthUser, @Body() dto: DraftQuoteDto) {
    const result = await this.assistantService.draftQuote(user.tenantId, dto.text);
    return { success: true, data: result };
  }
}
