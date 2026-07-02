// src/tenants/tenants.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findOne(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  // Seul le rôle OWNER peut modifier les paramètres de l'entreprise (vérifié au niveau du contrôleur)
  async update(tenantId: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }
}
