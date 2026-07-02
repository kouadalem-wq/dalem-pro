// src/products/dto/adjust-stock.dto.ts
// Endpoint dédié pour ajuster le stock (plutôt que de tout réécrire via update)
// delta peut être positif (réapprovisionnement) ou négatif (vente hors facture, casse, etc.)

import { IsInt } from 'class-validator';

export class AdjustStockDto {
  @IsInt({ message: 'Le delta doit être un nombre entier.' })
  delta: number;
}
