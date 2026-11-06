import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { metricsMiddleware } from './metrics/metrics.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // One JSON object per line in containers, readable text when developing.
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  app.enableShutdownHooks();
  app.use(metricsMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
