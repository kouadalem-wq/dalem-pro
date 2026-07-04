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

const LOGO_DIR = './uploads/logos';
const SIGNATURE_DIR = './uploads/signatures';

// Filtre commun : seules les images PNG/JPG/WEBP sont acceptees
function imageFileFilter(req: any, file: Express.Multer.File, callback: any) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return callback(
      new BadRequestException('Seuls les fichiers PNG, JPG et WEBP sont acceptés.'),
      false,
    );
  }
  callback(null, true);
}

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
          fs.mkdirSync(LOGO_DIR, { recursive: true });
          callback(null, LOGO_DIR);
        },
        filename: (req, file, callback) => {
          const user = (req as any).user as AuthUser;
          const uniqueSuffix = Date.now();
          const ext = extname(file.originalname);
          callback(null, `${user.tenantId}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: imageFileFilter,
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
    const logoUrl = `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/uploads/logos/${file.filename}`;
    const tenant = await this.tenantsService.update(user.tenantId, { logo: logoUrl });
    return { success: true, data: tenant };
  }

  // POST /tenants/me/signature — upload de la signature de l'entreprise
  // Meme principe que le logo : stockage local + URL publique enregistree.
  @Post('signature')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @UseInterceptors(
    FileInterceptor('signature', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          fs.mkdirSync(SIGNATURE_DIR, { recursive: true });
          callback(null, SIGNATURE_DIR);
        },
        filename: (req, file, callback) => {
          const user = (req as any).user as AuthUser;
          const uniqueSuffix = Date.now();
          const ext = extname(file.originalname);
          callback(null, `${user.tenantId}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo maximum
    }),
  )
  async uploadSignature(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    const signatureUrl = `${process.env.API_PUBLIC_URL ?? 'http://localhost:3001'}/uploads/signatures/${file.filename}`;
    const tenant = await this.tenantsService.update(user.tenantId, {
      signature: signatureUrl,
    });
    return { success: true, data: tenant };
  }
}