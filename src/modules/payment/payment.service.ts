import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { VNPay, ignoreLogger, VnpLocale, HashAlgorithm, dateFormat, ProductCode } from 'vnpay';
import type { IUser } from '@/shared/types/user.type';

@Injectable()
export class PaymentService {
  private vnpay: VNPay;

  constructor(private readonly prisma: PrismaService) {
    this.vnpay = new VNPay({
      tmnCode: process.env.VNPAY_TMN_CODE || '',
      secureSecret: process.env.VNPAY_SECRET_KEY || '',
      vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      testMode: true,
      hashAlgorithm: HashAlgorithm.SHA512,
      loggerFn: ignoreLogger,
    });
  }

  // ── Tạo link thanh toán VNPay ─────────────────────────────────────────────

  async createPaymentUrl(user: IUser, amount: number, ipAddr: string) {
    // Format mã đơn hàng: userId_timestamp
    const txnRef = `${user.id}_${Date.now()}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Normalize IP: VNPay không chấp nhận IPv6
    const normalizedIp = ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1' || !ipAddr
      ? '127.0.0.1'
      : ipAddr.replace(/^::ffff:/, '');

    const url = this.vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: normalizedIp,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `${txnRef}|nap_tien`,
      vnp_ReturnUrl: `${process.env.BE_DOMAIN || 'http://localhost:3001'}/api/payment/vnpay-return`,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });

    console.log({
      vnp_Amount: amount,
      vnp_IpAddr: normalizedIp,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `${txnRef}|nap_tien`,
      vnp_ReturnUrl: `${process.env.BE_DOMAIN || 'http://localhost:3001'}/api/payment/vnpay-return`,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    }, 'djasdjasijdi');


    return {
      message: 'Tạo link thanh toán thành công',
      data: { url, transactionId: txnRef },
    };
  }

  // ── Callback từ VNPay (GET redirect) ──────────────────────────────────────

  async handleVnpayReturn(query: Record<string, string>) {
    const orderInfo = query.vnp_OrderInfo || '';
    const parts = orderInfo.split('|');
    const txnRef = parts[0] || null;
    const responseCode = query.vnp_ResponseCode;
    const vnpAmount = Number(query.vnp_Amount) / 100;

    const frontendUrl = process.env.FE_DOMAIN || 'http://localhost:3000';

    if (!txnRef) {
      return { redirectUrl: `${frontendUrl}/deposit?status=fail&reason=invalid_order` };
    }

    // Parse userId từ txnRef (format: userId_timestamp)
    const txnParts = txnRef.split('_');
    const userId = txnParts[0];

    if (!userId) {
      return { redirectUrl: `${frontendUrl}/deposit?status=fail&reason=invalid_user` };
    }

    // Kiểm tra user có tồn tại không
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { redirectUrl: `${frontendUrl}/deposit?status=fail&reason=user_not_found` };
    }

    if (responseCode === '00') {
      // Thanh toán thành công
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { availableAmount: { increment: vnpAmount } },
        }),
        this.prisma.transaction.create({
          data: {
            id: txnRef,
            userId,
            type: 'deposit',
            amount: vnpAmount,
            status: 'completed',
            bankName: query.vnp_BankCode || 'VNPay',
          },
        }),
      ]);

      return {
        redirectUrl: `${frontendUrl}/deposit?status=success&amount=${vnpAmount}&transactionId=${txnRef}`,
      };
    }

    // Thanh toán thất bại
    return {
      redirectUrl: `${frontendUrl}/deposit?status=fail&code=${responseCode}`,
    };
  }

  // ── Lịch sử giao dịch ────────────────────────────────────────────────────

  async getMyTransactions(userId: string, query: Record<string, string>) {
    const { type, status, fromDate, toDate, page = '1', limit = '10' } = query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));

    const where: any = { userId, isDeleted: false };
    if (type) where.type = type;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      message: 'Lấy lịch sử giao dịch thành công',
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ── Admin: Lấy tất cả giao dịch ──────────────────────────────────────────

  async getAllTransactions(query: Record<string, string>) {
    const { userId, type, status, fromDate, toDate, page = '1', limit = '10' } = query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));

    const where: any = { isDeleted: false };
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      message: 'Lấy danh sách giao dịch thành công',
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
