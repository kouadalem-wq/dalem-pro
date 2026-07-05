// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  
 // Autorise le frontend à appeler l'API : localhost en dev, FRONTEND_URL en production
  const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Limite de taille du body montée pour le scan de reçus
  // (une photo en base64 pèse 1 à 8 Mo — la limite Express par défaut est ~100 Ko)
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // Sert les fichiers uploadés (logos, etc.) à l'adresse /uploads/...
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();