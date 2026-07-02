// src/clients/clients.service.ts
// Toute requête est systématiquement filtrée par tenantId
// C'est la garantie que jamais une entreprise ne peut voir les clients d'une autre

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  // Créer un client, toujours rattaché au tenant de l'utilisateur connecté
  async create(tenantId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  // Liste des clients actifs du tenant, les plus récents en premier
  async findAll(tenantId: string) {
    return this.prisma.client.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Un client précis — vérifie qu'il appartient bien au tenant demandeur
  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
    });

    if (!client) {
      throw new NotFoundException('Client introuvable.');
    }

    return client;
  }

  // Modification — le "findFirst" avec tenantId empêche de modifier
  // le client d'une autre entreprise même en devinant son id
  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(tenantId, id); // vérifie l'existence + l'appartenance

    return this.prisma.client.update({
      where: { id },
      data: dto,
    });
  }

  // Suppression douce (soft delete) : isActive passe à false
  // On ne supprime jamais vraiment un client — il peut être lié à des factures
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
