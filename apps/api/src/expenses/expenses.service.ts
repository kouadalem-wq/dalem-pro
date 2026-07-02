// src/expenses/expenses.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        tenantId,
        currency: dto.currency ?? 'XOF',
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.expense.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!expense) {
      throw new NotFoundException('Dépense introuvable.');
    }

    return expense;
  }

  async update(tenantId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(tenantId, id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  // Suppression définitive — contrairement aux clients/produits, une dépense
  // mal saisie peut être supprimée franchement (pas de facture qui y est liée)
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.expense.delete({ where: { id } });
  }
}
