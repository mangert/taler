import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Taler API')
    .setDescription('REST API for personal and family finance management')
    .setVersion('1.0')
    .addCookieAuth(
      'access_token',
      {
        type: 'apiKey',
        in: 'cookie',
      },
      'cookieAuth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'Taler API documentation',
  });
}
