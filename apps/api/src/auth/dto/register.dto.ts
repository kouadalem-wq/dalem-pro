// src/auth/dto/register.dto.ts
// Données attendues pour l'inscription d'une nouvelle entreprise (Tenant)
// Le premier utilisateur créé est automatiquement OWNER

import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  // Informations de l'entreprise
  @IsString()
  @MinLength(2, { message: "Le nom de l'entreprise doit contenir au moins 2 caractères." })
  companyName: string;

  @IsOptional()
  @IsString()
  currency?: string; // Ex: "XOF", "CAD" — XOF par défaut si non fourni

  @IsOptional()
  @IsString()
  country?: string; // Ex: "CI" — CI par défaut si non fourni

  // Informations du premier utilisateur (Owner)
  @IsEmail({}, { message: "Format d'email invalide." })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Le prénom est requis.' })
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Le nom est requis.' })
  lastName: string;
}
