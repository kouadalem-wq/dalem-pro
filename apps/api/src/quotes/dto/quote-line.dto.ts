// src/quotes/dto/quote-line.dto.ts
// Une ligne de devis peut referencer un produit existant (productId)
// ou etre une ligne libre (description manuelle, ex: "Frais de livraison").
// Une ligne libre peut avoir un prix NEGATIF (ex: "Remise fidelite") ;
// le service garantit que le total du devis reste >= 0.

import { IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';

export class QuoteLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01, { message: 'La quantite doit etre superieure a 0.' })
  quantity: number;

  // Si productId est fourni, le prix du produit sera utilise automatiquement.
  // unitPrice ici sert pour les lignes libres (pas de productId).
  // Peut etre negatif pour une remise.
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}
