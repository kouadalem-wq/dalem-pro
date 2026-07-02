// src/clients/clients.controller.ts
// Toutes les routes sont protégées : il faut être connecté (JwtAuthGuard)
// tenantId vient toujours du token JWT, jamais du corps de la requête
// (sinon un utilisateur malveillant pourrait passer un autre tenantId)

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto) {
    const client = await this.clientsService.create(user.tenantId, dto);
    return { success: true, data: client };
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const clients = await this.clientsService.findAll(user.tenantId);
    return { success: true, data: clients };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const client = await this.clientsService.findOne(user.tenantId, id);
    return { success: true, data: client };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const client = await this.clientsService.update(user.tenantId, id, dto);
    return { success: true, data: client };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.clientsService.remove(user.tenantId, id);
    return { success: true, message: 'Client désactivé avec succès.' };
  }
}
