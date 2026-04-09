import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { CourseModule } from '../course/course.module';

@Module({
    imports: [CourseModule],
    controllers: [PaymentController],
    providers: [PaymentService],
})
export class PaymentModule { }
