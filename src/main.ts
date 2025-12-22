import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { AppLogger } from './infras/loggers/logger.service';
import { HttpLoggerInterceptor } from './infras/loggers/http-logger.interceptor';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(AppLogger);

  app.useGlobalInterceptors(new HttpLoggerInterceptor(logger));

  await app.listen(3000);
}
bootstrap();
