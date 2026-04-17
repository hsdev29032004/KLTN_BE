import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/infras/prisma/prisma.service';

@Injectable()
export class DeleteInvoicePendingCronService {
  private readonly logger = new Logger(DeleteInvoicePendingCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run at minute 0 and 30 every hour
  @Cron('0,30 * * * *')
  async handleDeletePendingInvoices() {
    this.logger.log('Running delete pending invoices cron job');
    try {
      const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      const invoices = await this.prisma.invoices.findMany({
        where: {
          status: { in: ['pending', 'failed'] },
          createdAt: { lt: threshold },
        },
        select: { id: true },
      });

      if (!invoices || invoices.length === 0) {
        this.logger.log('No pending/failed invoices older than 30 minutes');
        return;
      }

      const ids = invoices.map((i) => i.id);

      await this.prisma.$transaction([
        this.prisma.detailInvoices.deleteMany({ where: { coursePurchaseId: { in: ids } } }),
        this.prisma.invoices.deleteMany({ where: { id: { in: ids } } }),
      ]);

      this.logger.log(`Deleted ${ids.length} pending/failed invoices and their detail records`);
    } catch (error) {
      this.logger.error('Error while deleting pending invoices', error);
    }
  }
}
