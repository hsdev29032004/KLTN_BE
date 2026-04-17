import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CourseService } from '../course/course.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseService: CourseService,
  ) {}

  // ── Callback từ VNPay (GET redirect) ──────────────────────────────────────

  async handleVnpayReturn(query: Record<string, string>) {
    const orderInfo = query.vnp_OrderInfo || '';
    const parts = orderInfo.split('|');
    const invoiceId = parts[0] || null;
    const responseCode = query.vnp_ResponseCode;

    const frontendUrl = process.env.FE_DOMAIN || 'http://localhost:3000';

    if (!invoiceId) {
      return { redirectUrl: `${frontendUrl}/payment?status=fail&reason=invalid_order` };
    }

    // Kiểm tra invoice tồn tại
    const invoice = await this.prisma.invoices.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { redirectUrl: `${frontendUrl}/payment?status=fail&reason=invoice_not_found` };
    }

    if (responseCode === '00') {
      // Thanh toán thành công → xử lý mua khóa học
      await this.courseService.handlePaymentSuccess(invoiceId);

      return {
        redirectUrl: `${frontendUrl}/payment?status=success&invoiceId=${invoiceId}`,
      };
    }

    // Thanh toán thất bại
    await this.courseService.handlePaymentFailed(invoiceId);

    return {
      redirectUrl: `${frontendUrl}/payment?status=fail&code=${responseCode}&invoiceId=${invoiceId}`,
    };
  }
}
