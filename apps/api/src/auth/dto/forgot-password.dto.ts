// src/auth/dto/forgot-password.dto.ts

import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Format d'email invalide." })
  email: string;
}
