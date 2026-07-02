// src/prisma/prisma.module.ts
// Module global : PrismaService est disponible partout sans réimporter

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
