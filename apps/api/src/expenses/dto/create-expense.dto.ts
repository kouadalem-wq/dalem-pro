// src/expenses/dto/create-expense.dto.ts

import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export enum ExpenseCategoryDto {
  SUPPLIES = 'SUPPLIES',
  RENT = 'RENT',
  SALARY = 'SALARY',
  TRANSPORT = 'TRANSPORT',
  MARKETING = 'MARKETING',
  UTILITIES = 'UTILITIES',
  TAXES = 'TAXES',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseCategoryDto)
  category?: ExpenseCategoryDto;

  @IsString()
  description: string;

  // Montant en centimes, cohérent avec le reste du système
  @IsInt()
  @Min(1, { message: 'Le montant doit être supérieur à 0.' })
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  receipt?: string; // URL du justificatif (upload géré plus tard)

  @IsOptional()
  @IsDateString()
  date?: string;
}
