// src/products/products.controller.ts

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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type AuthUser = { userId: string; tenantId: string; role: string };

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    const product = await this.productsService.create(user.tenantId, dto);
    return { success: true, data: product };
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    const products = await this.productsService.findAll(user.tenantId);
    return { success: true, data: products };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const product = await this.productsService.findOne(user.tenantId, id);
    return { success: true, data: product };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(user.tenantId, id, dto);
    return { success: true, data: product };
  }

  // Endpoint dédié pour ajuster le stock sans passer par un update complet
  @Patch(':id/stock')
  async adjustStock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    const product = await this.productsService.adjustStock(user.tenantId, id, dto);
    return { success: true, data: product };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.productsService.remove(user.tenantId, id);
    return { success: true, message: 'Produit désactivé avec succès.' };
  }
}
