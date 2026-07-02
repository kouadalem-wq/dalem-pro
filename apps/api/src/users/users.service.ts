// src/users/users.service.ts
// Gestion des utilisateurs d'un Tenant (l'équipe) : invitation, liste, activation/désactivation, suppression

import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InviteEmployeeDto } from './dto/invite-employee.dto';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findAllForTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteEmployee(tenantId: string, tenantName: string, dto: InviteEmployeeDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await argon2.hash(temporaryPassword);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: 'EMPLOYEE',
        resetToken,
        resetTokenExpiry,
      },
    });

    await this.mailService.sendEmployeeInvite({
      email: user.email,
      firstName: user.firstName,
      tenantName,
      setPasswordUrl: `${FRONTEND_URL}/reset-password?token=${resetToken}`,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  // Vérifie qu'un utilisateur cible existe bien dans le tenant et n'est pas OWNER
  // (protection commune à deactivate/reactivate/delete)
  private async getModifiableEmployee(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {
      throw new ConflictException('Utilisateur introuvable pour cette entreprise.');
    }
    if (user.role === 'OWNER') {
      throw new BadRequestException('Le propriétaire de l\'entreprise ne peut pas être modifié ici.');
    }
    return user;
  }

  async deactivate(tenantId: string, userId: string) {
    await this.getModifiableEmployee(tenantId, userId);
    return this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  }

  async reactivate(tenantId: string, userId: string) {
    await this.getModifiableEmployee(tenantId, userId);
    return this.prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  }

  // Suppression DÉFINITIVE du compte — contrairement à la désactivation,
  // action irréversible. Les documents créés par cet employé (devis,
  // factures...) restent en base car ils appartiennent au Tenant, pas à
  // l'utilisateur — aucune perte de données métier.
  async remove(tenantId: string, userId: string) {
    await this.getModifiableEmployee(tenantId, userId);
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
