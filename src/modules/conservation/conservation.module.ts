import { Module } from '@nestjs/common';
import { ConservationService } from './conservation.service';
import { ConservationController } from './conservation.controllers';
import { ChatGateway } from './chat.gateway';

@Module({
  providers: [ConservationService, ChatGateway],
  controllers: [ConservationController],
  exports: [ConservationService],
})
export class ConservationModule { }
