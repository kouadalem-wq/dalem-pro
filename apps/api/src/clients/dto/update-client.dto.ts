// src/clients/dto/update-client.dto.ts
// Tous les champs sont optionnels : on ne modifie que ce qui est fourni

import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}
