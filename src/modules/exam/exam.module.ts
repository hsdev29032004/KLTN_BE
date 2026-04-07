import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { PrismaService } from '@/infras/prisma/prisma.service';

@Module({
  controllers: [ExamController],
  providers: [ExamService, PrismaService],
  exports: [ExamService],
})
export class ExamModule { }
