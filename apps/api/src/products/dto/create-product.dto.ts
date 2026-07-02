// src/products/dto/create-product.dto.ts
// unitPrice est en CENTIMES (ex: 150000 = 1500,00 FCFA)
// C'est le frontend qui se charge de convertir l'affichage utilisateur en centimes

import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  MinLength,
} from 'class-validator';

export enum ProductTypeDto {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export class CreateProductDto {
  @IsString()
  @MinLength(1, { message: 'Le nom du produit est requis.' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductTypeDto, { message: 'Le type doit être PRODUCT ou SERVICE.' })
  type?: ProductTypeDto;

  @IsInt({ message: 'Le prix doit être un nombre entier de centimes.' })
  @Min(0, { message: 'Le prix ne peut pas être négatif.' })
  unitPrice: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'La quantité en stock ne peut pas être négative.' })
  stockQuantity?: number;

  @IsOptional()
  @IsString()
  unit?: string; // Ex: "kg", "unité", "heure"
}
