// src/auth/dto/login.dto.ts
// Données attendues pour la connexion

import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: "Format d'email invalide." })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Le mot de passe est requis.' })
  password: string;
}
