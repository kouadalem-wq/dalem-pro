// src/users/users.controller.ts

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
import { UsersService } from './users.service';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const users = await this.usersService.findAllForTenant(user.tenantId);
    return { success: true, data: users };
  }

  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async invite(@CurrentUser() user: AuthUser, @Body() dto: InviteEmployeeDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    const newUser = await this.usersService.inviteEmployee(user.tenantId, tenant!.name, dto);
    return { success: true, data: newUser };
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.usersService.deactivate(user.tenantId, id);
    return { success: true, message: 'Employé désactivé avec succès.' };
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async reactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.usersService.reactivate(user.tenantId, id);
    return { success: true, message: 'Employé réactivé avec succès.' };
  }

  // DELETE /users/:id — suppression définitive, réservée au propriétaire
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.usersService.remove(user.tenantId, id);
    return { success: true, message: 'Compte supprimé définitivement.' };
  }
}
