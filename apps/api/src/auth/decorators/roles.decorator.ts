// src/auth/decorators/roles.decorator.ts
// Décorateur pour marquer une route comme réservée à certains rôles
// Usage : @Roles('OWNER')

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
