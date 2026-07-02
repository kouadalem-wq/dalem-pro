// src/auth/guards/jwt-auth.guard.ts
// Guard à utiliser sur les routes qui nécessitent d'être connecté
// Usage : @UseGuards(JwtAuthGuard) sur un contrôleur ou une méthode

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
