// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Autorise le frontend (Vite, port 5173) à appeler l'API
  app.enableCors({
    origin: 'http://localhost:5173',
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

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();