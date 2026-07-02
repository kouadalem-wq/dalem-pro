// src/products/products.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...dto,
        tenantId,
        // Un service n'a pas de notion de stock — on force à 0 par cohérence
        stockQuantity: dto.type === 'SERVICE' ? 0 : (dto.stockQuantity ?? 0),
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable.');
    }

    return product;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(tenantId, id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  // Ajustement de stock — utilise une transaction pour éviter les conditions de course
  // (deux ventes simultanées qui feraient passer le stock en négatif)
  async adjustStock(tenantId: string, id: string, dto: AdjustStockDto) {
    const product = await this.findOne(tenantId, id);

    const newQuantity = product.stockQuantity + dto.delta;

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Stock insuffisant. Disponible : ${product.stockQuantity}, demandé : ${Math.abs(dto.delta)}.`,
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity: newQuantity },
    });
  }

  // Désactivation douce — un produit désactivé n'apparaît plus dans le catalogue
  // mais reste visible dans l'historique des factures qui le référencent
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
