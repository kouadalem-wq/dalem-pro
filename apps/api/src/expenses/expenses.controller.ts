// src/expenses/expenses.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    const expense = await this.expensesService.create(user.tenantId, dto);
    return { success: true, data: expense };
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const expenses = await this.expensesService.findAll(user.tenantId);
    return { success: true, data: expenses };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const expense = await this.expensesService.findOne(user.tenantId, id);
    return { success: true, data: expense };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const expense = await this.expensesService.update(user.tenantId, id, dto);
    return { success: true, data: expense };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.expensesService.remove(user.tenantId, id);
    return { success: true, message: 'Dépense supprimée avec succès.' };
  }
}
