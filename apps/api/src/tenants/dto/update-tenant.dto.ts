// src/tenants/dto/update-tenant.dto.ts
import { IsOptional, IsString, IsEnum, IsInt, Min, IsIn } from 'class-validator';

export enum PdfTemplateDto {
  MODERN = 'MODERN',
  CLASSIC = 'CLASSIC',
}

// Devises acceptees (codes ISO 4217)
const DEVISES = [
  'XOF', 'XAF', 'GHS', 'NGN', 'GNF',
  'MAD', 'DZD', 'TND',
  'EUR', 'CAD', 'USD', 'GBP',
];

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsEnum(PdfTemplateDto, { message: 'Le template doit être MODERN ou CLASSIC.' })
  pdfTemplate?: PdfTemplateDto;

  // Devise : uniquement un code ISO de la liste autorisee
  @IsOptional()
  @IsIn(DEVISES, { message: 'Devise non reconnue.' })
  currency?: string;
  @IsOptional()
  @IsString()
  signatureLabel?: string;

  // Argent disponible au debut de l'activite (en centimes, entier positif)
  @IsOptional()
  @IsInt({ message: 'Le solde doit être un nombre entier.' })
  @Min(0, { message: 'Le solde ne peut pas être négatif.' })
  soldeInitial?: number;
}