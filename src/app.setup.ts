import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/** main.ts 와 e2e 테스트가 같은 전역 설정을 쓰도록 분리한다. */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  setupSwagger(app);
}

/** Swagger UI: /api/docs, OpenAPI JSON: /api/docs-json */
function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('푸드트럭 API')
    .setDescription('푸드트럭 위치 등록 앱 API 명세')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    // 새로고침해도 입력한 토큰이 유지되도록 한다.
    swaggerOptions: { persistAuthorization: true },
  });
}
