import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  logger.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Task Workflow Engine is running!                     ║
║                                                           ║
║   🌐 Server:   http://localhost:${port}                      ║
║   📡 API:      http://localhost:${port}/api                  ║
║                                                           ║
║   🔐 Default Admin:                                       ║
║      Email:    ${configService.get('DEFAULT_ADMIN_EMAIL', 'admin@example.com')}      ║
║      Password: ${configService.get('DEFAULT_ADMIN_PASSWORD', 'admin123')}               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
