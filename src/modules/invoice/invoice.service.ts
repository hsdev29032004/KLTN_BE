import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { ROLE_NAME } from '@/shared/constants/auth.constant';
import type { IUser } from '@/shared/types/user.type';
import type { QueryDetailInvoiceDto } from './dto/query-detail-invoice.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) { }

  async getDetailInvoices(user: IUser, query: QueryDetailInvoiceDto) {
    const {
      courseId,
      userId,
      status,
      invoiceId,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit as string) || 10));

    const roleName = user.role?.name;
    const isAdmin = roleName === ROLE_NAME.ADMIN;
    const isTeacher = roleName === ROLE_NAME.TEACHER;

    // Build where clause
    const where: Prisma.DetailInvoicesWhereInput = {};

    if (courseId) {
      where.courseId = courseId;
    }

    if (status) {
      where.status = status;
    }

    if (invoiceId) {
      where.coursePurchaseId = invoiceId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!isNaN(from.getTime())) {
          (where.createdAt as any).gte = from;
        }
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          (where.createdAt as any).lte = to;
        }
      }
    }

    if (isAdmin) {
      // Admin can filter by userId (buyer)
      if (userId) {
        where.invoices = { userId };
      }
    } else if (isTeacher) {
      // Teacher can only see detail invoices of their own courses
      where.courses = { userId: user.id, isDeleted: false };

      // Teacher cannot filter by arbitrary userId — ignore the param
    } else {
      throw new ForbiddenException(
        'Bạn không có quyền xem danh sách chi tiết hóa đơn',
      );
    }

    // Allowed sort fields
    const allowedSortFields = ['createdAt', 'price', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.detailInvoices.findMany({
        where,
        select: {
          id: true,
          price: true,
          commissionRate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          courses: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatar: true,
                },
              },
            },
          },
          invoices: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
              users: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: { [safeSortBy]: order === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.detailInvoices.count({ where }),
    ]);

    // teacherEarnings calculated from the rate stored at purchase time
    const enrichedData = data.map((item) => {
      const rate = Number(item.commissionRate);
      return {
        ...item,
        commissionRate: rate,
        teacherEarnings: Math.floor(item.price * rate / 100),
      };
    });

    return {
      message: 'Lấy danh sách chi tiết hóa đơn thành công',
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Hóa đơn của user ─────────────────────────────────────────────────────

  async getMyInvoices(userId: string, query: Record<string, string>) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));
    const { status, fromDate, toDate } = query;

    const where: Prisma.InvoicesWhereInput = { userId, isDeleted: false };

    if (status) where.status = status as any;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!isNaN(from.getTime())) (where.createdAt as any).gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          (where.createdAt as any).lte = to;
        }
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.invoices.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          detail_invoices: {
            select: {
              id: true,
              price: true,
              commissionRate: true,
              status: true,
              courses: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  thumbnail: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.invoices.count({ where }),
    ]);

    return {
      message: 'Lấy danh sách hóa đơn thành công',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMyInvoiceDetail(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoices.findFirst({
      where: { id: invoiceId, userId, isDeleted: false },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        detail_invoices: {
          select: {
            id: true,
            price: true,
            commissionRate: true,
            status: true,
            createdAt: true,
            courses: {
              select: {
                id: true,
                name: true,
                slug: true,
                thumbnail: true,
                user: {
                  select: { id: true, fullName: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new ForbiddenException('Không tìm thấy hóa đơn');
    }

    return { message: 'Lấy chi tiết hóa đơn thành công', data: invoice };
  }
}
