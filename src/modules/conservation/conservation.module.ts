import { Module } from '@nestjs/common';
import { ConservationService } from './conservation.service';
import { ConservationController } from './conservation.controllers';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '@/infras/prisma/prisma.service';

@Module({
  providers: [ConservationService, ChatGateway, PrismaService],
  controllers: [ConservationController],
  exports: [ConservationService],
})
export class ConservationModule { }
