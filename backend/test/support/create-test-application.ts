import type { INestApplication, Provider, Type } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApplication } from '../../src/common/bootstrap/configure-application.js';
import { configureSwagger } from '../../src/common/swagger/configure-swagger.js';

export interface CreateTestApplicationOptions {
  controllers?: Type<unknown>[];
  providers?: Provider[];
  configureModule?: (
    moduleBuilder: TestingModuleBuilder,
  ) => TestingModuleBuilder;
  enableSwagger?: boolean;
}

export async function createTestApplication(
  options: CreateTestApplicationOptions = {},
): Promise<INestApplication> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
    providers: options.providers ?? [],
  });
  const configuredModuleBuilder =
    options.configureModule?.(moduleBuilder) ?? moduleBuilder;
  const moduleFixture = await configuredModuleBuilder.compile();
  const app = moduleFixture.createNestApplication();

  configureApplication(app);

  if (options.enableSwagger) {
    configureSwagger(app);
  }

  await app.init();

  return app;
}
