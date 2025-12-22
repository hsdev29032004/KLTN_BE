import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLogger } from './infras/loggers/logger.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AppLogger],
})
export class AppModule {}
