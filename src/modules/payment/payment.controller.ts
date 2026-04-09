import { Controller, Get, Query, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import type { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @PublicAPI()
  @Get('vnpay-return')
  async vnpayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.handleVnpayReturn(query);
    return res.redirect(result.redirectUrl);
  }
}
