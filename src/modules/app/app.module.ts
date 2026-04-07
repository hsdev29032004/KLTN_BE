import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LockAmountCronService } from '@/infras/cron/lock-amount-cron.service';
import { AppLogger } from '@/infras/loggers/logger.service';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { PermissionModule } from '../permission/permission.module';
import { CourseModule } from '../course/course.module';
import { ReviewModule } from '../review/review.module';
import { SystemModule } from '../system/system.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { AuthMiddleware } from '@/core/middlewares/auth.middleware';
import { StatModule } from '../stat/stat.module';
import { ConservationModule } from '../conservation/conservation.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { PaymentModule } from '../payment/payment.module';
import { ExamModule } from '../exam/exam.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule, RoleModule, PermissionModule, CourseModule, ReviewModule, SystemModule, StatModule, ConservationModule, InvoiceModule, PaymentModule, ExamModule],
  controllers: [AppController],
  providers: [
    AppService,
    LockAmountCronService,
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
