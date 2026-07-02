// src/prisma/prisma.service.ts
// Service Prisma — connecte NestJS à PostgreSQL
// Injecté partout où on a besoin d'accéder à la base de données

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Connexion à la base au démarrage du module
  async onModuleInit() {
    await this.$connect();
  }

  // Déconnexion propre à l'arrêt de l'application
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
