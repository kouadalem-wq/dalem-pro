// src/assistant/dto/scan-receipt.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class ScanReceiptDto {
  // Image encodee en base64 (sans le prefixe data:image/...)
  @IsString()
  @IsNotEmpty()
  imageBase64: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string; // image/jpeg, image/png, image/webp
}
