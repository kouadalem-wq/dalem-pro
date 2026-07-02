// src/users/dto/invite-employee.dto.ts

import { IsEmail, IsString, MinLength } from 'class-validator';

export class InviteEmployeeDto {
  @IsEmail({}, { message: "Format d'email invalide." })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Le prénom est requis.' })
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Le nom est requis.' })
  lastName: string;
}
