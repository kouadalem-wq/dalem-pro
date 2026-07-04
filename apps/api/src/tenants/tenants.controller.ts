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
import { memoryStorage } from 'multer';
import { TenantsService } from './tenants.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

// Filtre commun : seules les images PNG/JPG/WEBP sont acceptees
function imageFileFilter(req: any, file: Express.Multer.File, callback: any) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Seuls les fichiers PNG, JPG et WEBP sont acceptes.',
      ),
      false,
    );
  }
  callback(null, true);
}

@Controller('tenants/me')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private tenantsService: TenantsService,
    private cloudinary: CloudinaryService,
  ) {}

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

  // POST /tenants/me/logo - upload du logo vers Cloudinary.
  // Le fichier reste en memoire (memoryStorage), il est envoye a Cloudinary,
  // et l'URL permanente renvoyee est enregistree sur le Tenant.
  @Post('logo')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo maximum
    }),
  )
  async uploadLogo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier recu.');
    }
    const logoUrl = await this.cloudinary.uploadImage(file, 'dalem-pro/logos');
    const tenant = await this.tenantsService.update(user.tenantId, {
      logo: logoUrl,
    });
    return { success: true, data: tenant };
  }

  // POST /tenants/me/signature - upload de la signature vers Cloudinary.
  // Meme principe que le logo.
  @Post('signature')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @UseInterceptors(
    FileInterceptor('signature', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo maximum
    }),
  )
  async uploadSignature(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier recu.');
    }
    const signatureUrl = await this.cloudinary.uploadImage(
      file,
      'dalem-pro/signatures',
    );
    const tenant = await this.tenantsService.update(user.tenantId, {
      signature: signatureUrl,
    });
    return { success: true, data: tenant };
  }
}
