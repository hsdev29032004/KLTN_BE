import { Controller, Post, Get, Body, Query, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { User } from '@/common/decorators/user.decorator';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { IUser } from '@/shared/types/user.type';
import type { Request, Response } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @SkipPermission()
  @Post('create-payment-url')
  createPaymentUrl(
    @User() user: IUser,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    return this.paymentService.createPaymentUrl(user, dto.amount, ip);
  }

  @PublicAPI()
  @Get('vnpay-return')
  async vnpayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.handleVnpayReturn(query);
    return res.redirect(result.redirectUrl);
  }

  @SkipPermission()
  @Get('transactions')
  getMyTransactions(
    @User() user: IUser,
    @Query() query: Record<string, string>,
  ) {
    return this.paymentService.getMyTransactions(user.id, query);
  }

  @Roles('admin')
  @Get('admin/transactions')
  getAllTransactions(
    @Query() query: Record<string, string>,
  ) {
    return this.paymentService.getAllTransactions(query);
  }
}
