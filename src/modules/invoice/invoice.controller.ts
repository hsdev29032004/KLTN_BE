import { Controller, Get, Param, Query } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import type { IUser } from '@/shared/types/user.type';
import { QueryDetailInvoiceDto } from './dto/query-detail-invoice.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Roles('admin', 'teacher')
  @Get('details')
  getDetailInvoices(
    @User() user: IUser,
    @Query() query: QueryDetailInvoiceDto,
  ) {
    return this.invoiceService.getDetailInvoices(user, query);
  }

  @SkipPermission()
  @Get('my')
  getMyInvoices(@User() user: IUser, @Query() query: Record<string, string>) {
    return this.invoiceService.getMyInvoices(user.id, query);
  }

  @SkipPermission()
  @Get('my/:id')
  getMyInvoiceDetail(@User() user: IUser, @Param('id') id: string) {
    return this.invoiceService.getMyInvoiceDetail(user.id, id);
  }

  @Roles('admin', 'teacher')
  @Get('payroll')
  getPayroll(@Query() query: QueryPayrollDto) {
    return this.invoiceService.getPayroll(query as Record<string, string>);
  }
}
