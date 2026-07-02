// src/auth/decorators/current-user.decorator.ts
// Décorateur pratique pour récupérer l'utilisateur connecté dans un contrôleur
// Usage : findAll(@CurrentUser() user: { userId: string; tenantId: string; role: string })

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
