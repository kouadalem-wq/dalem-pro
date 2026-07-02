// src/assistant/dto/edit-quote.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ChatMessageDto } from './chat.dto';

export class EditQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  // Historique de la conversation de modification (pour le dialogue iteratif)
  @IsOptional()
  @IsArray()
  history?: ChatMessageDto[];

  // Brouillon en cours affiche a l'utilisateur (l'IA le modifie a chaque tour)
  @IsOptional()
  @IsObject()
  draft?: {
    quoteId: string;
    lines: {
      productId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
    }[];
    taxRate: number;
  };
}
