import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppLogger } from '@/infras/loggers/logger.service';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { PermissionModule } from '../permission/permission.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { AuthMiddleware } from '@/core/middlewares/auth.middleware';

@Module({
  imports: [AuthModule, RoleModule, PermissionModule],
  controllers: [AppController],
  providers: [
    AppService,
    AppLogger,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude('auth/refresh-token')
      .forRoutes('*');
  }
}
