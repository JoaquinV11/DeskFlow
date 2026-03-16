import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:3001'],
    credentials: false,
  });

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
  .setTitle('DeskFlow API')
  .setDescription('HelpDesk B2B backend-first con NestJS, Prisma y PostgreSQL')
  .setVersion('1.0.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Pegá el accessToken (sin "Bearer ")',
    },
    'access-token',
  )
  .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      customSiteTitle: 'DeskFlow API Docs',
      persistAuthorization: true,
    },
    useGlobalPrefix: true, //acceder por /api/docs
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`DeskFlow API running on http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
