import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { AppLogger } from './infras/loggers/logger.service';
import { HttpLoggerInterceptor } from './infras/loggers/http-logger.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('KLTN API')
    .setDescription('API documentation for KLTN Backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access_token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const logger = app.get(AppLogger);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new HttpLoggerInterceptor(logger),
    new ResponseInterceptor(),
  );

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
