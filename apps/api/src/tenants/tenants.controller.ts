// src/tenants/tenants.controller.ts

import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

const UPLOAD_DIR = './uploads/logos';

@Controller('tenants/me')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  async getMe(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenantsService.findOne(user.tenantId);
    return { success: true, data: tenant };
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateTenantDto) {
    const tenant = await this.tenantsService.update(user.tenantId, dto);
    return { success: true, data: tenant };
  }

  // POST /tenants/me/logo — upload direct d'un fichier logo (PNG/JPG)
  // Le fichier est stocké localement et son URL publique est enregistrée
  // sur le Tenant automatiquement.
  @Post('logo')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          // Crée le dossier de destination s'il n'existe pas encore
          fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          callback(null, UPLOAD_DIR);
        },
        filename: (req, file, callback) => {
          const user = (req as any).user as AuthUser;
          const uniqueSuffix = Date.now();
          const ext = extname(file.originalname);
          callback(null, `${user.tenantId}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Seuls les fichiers PNG, JPG et WEBP sont acceptés.'),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo maximum
    }),
  )
  async uploadLogo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }

    // Construit l'URL publique accessible via le serveur statique configuré dans main.ts
    const logoUrl = `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/uploads/logos/${file.filename}`;

    const tenant = await this.tenantsService.update(user.tenantId, { logo: logoUrl });
    return { success: true, data: tenant };
  }
}
