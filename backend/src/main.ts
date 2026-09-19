import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureSwagger } from './common/swagger/configure-swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureSwagger(app);

  await app.listen(config.getOrThrow<number>('PORT'));
}
await bootstrap();
