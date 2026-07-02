// src/quotes/dto/quote-line.dto.ts
// Une ligne de devis peut référencer un produit existant (productId)
// ou être une ligne libre (description manuelle, ex: "Frais de livraison")

import { IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';

export class QuoteLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01, { message: 'La quantité doit être supérieure à 0.' })
  quantity: number;

  // Si productId est fourni, le prix du produit sera utilisé automatiquement.
  // unitPrice ici sert pour les lignes libres (pas de productId).
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
