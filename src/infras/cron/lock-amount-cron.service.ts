import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infras/prisma/prisma.service';

@Injectable()
export class LockAmountCronService {
  private readonly logger = new Logger(LockAmountCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 * * *') // Chạy mỗi ngày lúc 0h00
  async handleUnlockAmounts() {
    this.logger.log('Starting unlock amounts cron job');

    try {
      const now = new Date();

      // Lấy tất cả bản ghi LockAmount có isLock = true và unlockTime <= now
      const lockAmountsToUnlock = await this.prisma.lockAmount.findMany({
        where: {
          isLock: true,
          unlockTime: {
            lte: now,
          },
        },
      });

      if (lockAmountsToUnlock.length === 0) {
        this.logger.log('No lock amounts to unlock');
        return;
      }

      this.logger.log(`Found ${lockAmountsToUnlock.length} lock amounts to unlock`);

      // Xử lý từng bản ghi
      for (const lockAmount of lockAmountsToUnlock) {
        await this.prisma.$transaction(async (tx) => {
          // Cập nhật user: giảm lockAmount, tăng availableAmount
          await tx.user.update({
            where: { id: lockAmount.userId },
            data: {
              lockAmount: {
                decrement: lockAmount.amount,
              },
              availableAmount: {
                increment: lockAmount.amount,
              },
            },
          });

          // Cập nhật LockAmount: isLock = false
          await tx.lockAmount.update({
            where: { id: lockAmount.id },
            data: {
              isLock: false,
            },
          });
        });

        this.logger.log(`Unlocked ${lockAmount.amount} for user ${lockAmount.userId}`);
      }

      this.logger.log('Unlock amounts cron job completed successfully');
    } catch (error) {
      this.logger.error('Error in unlock amounts cron job', error);
    }
  }
}