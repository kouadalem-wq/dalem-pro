// src/tenants/dto/update-tenant.dto.ts

import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum PdfTemplateDto {
  MODERN = 'MODERN',
  CLASSIC = 'CLASSIC',
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsEnum(PdfTemplateDto, { message: 'Le template doit être MODERN ou CLASSIC.' })
  pdfTemplate?: PdfTemplateDto;
}
