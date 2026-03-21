import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infras/prisma/prisma.service';

@Injectable()
export class LockAmountCronService {
  private readonly logger = new Logger(LockAmountCronService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron('0 0 * * *') // Chạy mỗi ngày lúc 0h00
  async handleUnlockAmounts() {
    this.logger.log('Starting settle purchases cron job');

    try {
      const now = new Date();

      // Lấy cấu hình hệ thống để biết thời hạn hoàn tiền
      const system = await this.prisma.system.findUnique({
        where: { id: 'system' },
      });

      if (!system) {
        this.logger.warn('System config not found, skipping cron job');
        return;
      }

      // Mốc thời gian: hóa đơn tạo trước đây đúng timeRefund ngày
      const refundDeadline = new Date(now);
      refundDeadline.setDate(refundDeadline.getDate() - system.timeRefund);

      // Lùi thêm 1 ngày để lấy đúng cửa sổ 24h (tránh xử lý lại hóa đơn cũ hơn)
      const windowStart = new Date(refundDeadline);
      windowStart.setDate(windowStart.getDate() - 1);

      // Lấy hóa đơn có createdAt rơi đúng vào khoảng hết hạn hoàn tiền hôm nay
      const purchasesToSettle = await this.prisma.coursePurchase.findMany({
        where: {
          status: 'purchased',
          isDeleted: false,
          createdAt: {
            gt: windowStart,
            lte: refundDeadline,
          },
        },
        include: {
          course: true,
        },
      });

      if (purchasesToSettle.length === 0) {
        this.logger.log('No purchases to settle today');
        return;
      }

      this.logger.log(`Found ${purchasesToSettle.length} purchases to settle`);

      // Xử lý từng hóa đơn
      for (const purchase of purchasesToSettle) {
        await this.prisma.$transaction(async (tx) => {
          // Tính tiền thực nhận của giảng viên sau khi trừ hoa hồng
          const commissionAmount = Math.floor(
            (purchase.amount * Number(system.comissionRate)) / 100,
          );
          const instructorAmount = purchase.amount - commissionAmount;

          // Chuyển tiền từ lockAmount sang availableAmount cho giảng viên
          await tx.user.update({
            where: { id: purchase.course.userId },
            data: {
              lockAmount: { decrement: instructorAmount },
              availableAmount: { increment: instructorAmount },
            },
          });
        });

        this.logger.log(
          `Settled purchase ${purchase.id}: instructor ${purchase.course.userId} received ${purchase.amount - Math.floor((purchase.amount * Number(system.comissionRate)) / 100)}`,
        );
      }

      this.logger.log('Settle purchases cron job completed successfully');
    } catch (error) {
      this.logger.error('Error in settle purchases cron job', error);
    }
  }
}