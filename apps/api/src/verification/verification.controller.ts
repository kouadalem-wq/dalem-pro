// src/verification/verification.controller.ts
// Route PUBLIQUE (pas de JwtAuthGuard) : accessible en scannant le QR,
// sans aucune connexion. C'est volontaire : n'importe qui doit pouvoir
// verifier l'authenticite d'un document qu'on lui presente.

import { Controller, Get, Param } from '@nestjs/common';
import { VerificationService } from './verification.service';

@Controller('verify')
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  @Get(':token')
  async verify(@Param('token') token: string) {
    const data = await this.verificationService.verify(token);
    return { success: true, data };
  }
}