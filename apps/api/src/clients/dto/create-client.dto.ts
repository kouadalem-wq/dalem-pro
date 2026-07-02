// src/clients/dto/create-client.dto.ts

import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MinLength(1, { message: 'Le nom du client est requis.' })
  name: string;

  @IsOptional()
  @IsEmail({}, { message: "Format d'email invalide." })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
