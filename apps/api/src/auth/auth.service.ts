// src/auth/auth.service.ts
// Logique métier de l'authentification :
// - register / login / refreshFromToken
// - forgotPassword / resetPassword : réinitialisation par email avec token temporaire

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const baseSlug = dto.companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const passwordHash = await argon2.hash(dto.password);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.companyName,
        slug,
        email: dto.email,
        currency: dto.currency ?? 'XOF',
        country: dto.country ?? 'CI',
        users: {
          create: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const owner = tenant.users[0];
    const tokens = await this.generateTokens(owner.id, tenant.id, owner.role);

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, currency: tenant.currency },
      user: {
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        role: owner.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte a été désactivé.');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('Ce compte entreprise a été suspendu.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);

    return {
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        currency: user.tenant.currency,
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshFromToken(refreshToken: string) {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Utilisateur introuvable ou désactivé.');
    }

    return this.generateTokens(user.id, user.tenantId, user.role);
  }

  // Demande de réinitialisation — génère un token temporaire (1h) et envoie l'email.
  // Renvoie toujours un succès générique, qu'un compte existe ou non avec cet
  // email : ça évite de révéler à un attaquant quels emails sont enregistrés.
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      return; // Silence volontaire — pas d'indice donné sur l'existence du compte
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await this.mailService.sendPasswordReset({
      email: user.email,
      firstName: user.firstName,
      resetUrl: `${FRONTEND_URL}/reset-password?token=${resetToken}`,
    });
  }

  // Réinitialise effectivement le mot de passe à partir d'un token valide et non expiré
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { resetToken: dto.token } });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré.');
    }

    // Sécurité : empêche de "réinitialiser" avec exactement le même mot de
    // passe qu'avant — force un vrai changement.
    // (Cas particulier de l'invitation employé : le hash initial est aléatoire
    // et inconnu de l'utilisateur, donc cette vérification ne bloque jamais
    // la première définition de mot de passe.)
    const isSamePassword = await argon2.verify(user.passwordHash, dto.newPassword);
    if (isSamePassword) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent de votre mot de passe actuel.',
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }

  private async generateTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenantId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: process.env.JWT_SECRET, expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken };
  }
}
