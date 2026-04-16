// stat.service.ts
import { PrismaService } from '@/infras/prisma/prisma.service';
import { ROLE_NAME } from '@/shared/constants/auth.constant';
import type { IUser } from '@/shared/types/user.type';
import type {
  QueryRevenueDto,
  QueryUserStatDto,
  QueryCourseStatDto,
} from './dto/query-stat.dto';
import type { Prisma } from '@prisma/client';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDateRange(fromDate?: string, toDate?: string) {
  const range: { gte?: Date; lte?: Date } = {};
  if (fromDate) {
    const d = new Date(fromDate);
    if (!isNaN(d.getTime())) range.gte = d;
  }
  if (toDate) {
    const d = new Date(toDate);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.lte = d;
    }
  }
  return Object.keys(range).length ? range : undefined;
}

function getTruncExpr(groupBy: string): string {
  const allowed = ['day', 'week', 'month', 'year'];
  const safe = allowed.includes(groupBy) ? groupBy : 'month';
  return safe;
}

// Nhóm mảng records theo khoảng thời gian (JS side, tương thích mọi DB adapter)
function groupByPeriod<T extends { createdAt: Date }>(
  records: T[],
  period: string,
): { period: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const r of records) {
    const d = new Date(r.createdAt);
    let key: string;
    switch (period) {
      case 'day':
        key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      case 'week': {
        // ISO week: lấy Monday đầu tuần
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diff);
        key = monday.toISOString().slice(0, 10);
        break;
      }
      case 'year':
        key = String(d.getFullYear());
        break;
      default: // month
        key = d.toISOString().slice(0, 7); // YYYY-MM
        break;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, items]) => ({ period, items }));
}

@Injectable()
export class StatService {
  constructor(private readonly prisma: PrismaService) {}

  // ══════════════════════════════════════════════════════════════════════════
  //  1. DASHBOARD OVERVIEW  (Admin)
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboardOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const [
      totalUsers,
      totalCourses,
      totalRevenue,
      totalTransactions,
      totalReviews,
      totalReports,
      newUsersThisMonth,
      newUsersLastMonth,
      revenueThisMonth,
      revenueLastMonth,
      newCoursesThisMonth,
      newCoursesLastMonth,
      pendingApprovals,
      pendingReports,
      pendingWithdrawals,
      usersByRole,
      coursesByStatus,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.course.count({ where: { isDeleted: false } }),
      this.prisma.detailInvoices.aggregate({ _sum: { price: true } }),
      this.prisma.transaction.count({ where: { isDeleted: false } }),
      this.prisma.courseReview.count({ where: { isDeleted: false } }),
      this.prisma.courseReport.count({ where: { isDeleted: false } }),

      // Tăng trưởng user tháng này vs tháng trước
      this.prisma.user.count({
        where: { isDeleted: false, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.user.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      // Doanh thu tháng này vs tháng trước
      this.prisma.detailInvoices.aggregate({
        _sum: { price: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.detailInvoices.aggregate({
        _sum: { price: true },
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),

      // Khóa học mới tháng này vs tháng trước
      this.prisma.course.count({
        where: { isDeleted: false, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.course.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      // Các mục chờ xử lý
      this.prisma.courseApproval.count({ where: { status: 'pending' } }),
      this.prisma.courseReport.count({
        where: { status: 'pending', isDeleted: false },
      }),
      this.prisma.transaction.count({
        where: { status: 'pending', type: 'withdrawal', isDeleted: false },
      }),

      // Phân bố
      this.prisma.user.groupBy({
        by: ['roleId'],
        _count: { id: true },
        where: { isDeleted: false },
      }),
      this.prisma.course.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { isDeleted: false },
      }),
    ]);

    // Map roleId → roleName
    const roles = await this.prisma.role.findMany({
      select: { id: true, name: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r.name]));
    const usersByRoleNamed = usersByRole.map((g) => ({
      role: roleMap.get(g.roleId) || g.roleId,
      count: g._count.id,
    }));

    const revThisMonth = revenueThisMonth._sum.price ?? 0;
    const revLastMonth = revenueLastMonth._sum.price ?? 0;

    return {
      message: 'Lấy tổng quan dashboard thành công',
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalRevenue: totalRevenue._sum.price ?? 0,
          totalTransactions,
          totalReviews,
          totalReports,
        },
        trends: {
          users: {
            thisMonth: newUsersThisMonth,
            lastMonth: newUsersLastMonth,
            growth:
              newUsersLastMonth > 0
                ? Math.round(
                    ((newUsersThisMonth - newUsersLastMonth) /
                      newUsersLastMonth) *
                      100,
                  )
                : newUsersThisMonth > 0
                  ? 100
                  : 0,
          },
          revenue: {
            thisMonth: revThisMonth,
            lastMonth: revLastMonth,
            growth:
              revLastMonth > 0
                ? Math.round(
                    ((revThisMonth - revLastMonth) / revLastMonth) * 100,
                  )
                : revThisMonth > 0
                  ? 100
                  : 0,
          },
          courses: {
            thisMonth: newCoursesThisMonth,
            lastMonth: newCoursesLastMonth,
            growth:
              newCoursesLastMonth > 0
                ? Math.round(
                    ((newCoursesThisMonth - newCoursesLastMonth) /
                      newCoursesLastMonth) *
                      100,
                  )
                : newCoursesThisMonth > 0
                  ? 100
                  : 0,
          },
        },
        pending: {
          approvals: pendingApprovals,
          reports: pendingReports,
          withdrawals: pendingWithdrawals,
        },
        distributions: {
          usersByRole: usersByRoleNamed,
          coursesByStatus: coursesByStatus.map((g) => ({
            status: g.status,
            count: g._count.id,
          })),
        },
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  2. THỐNG KÊ DOANH THU  (Admin)
  // ══════════════════════════════════════════════════════════════════════════

  async getRevenueStats(query: QueryRevenueDto) {
    const {
      teacherId,
      courseId,
      studentId,
      fromDate,
      toDate,
      groupBy = 'month',
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(query.limit as string) || 20),
    );

    // Build where
    const where: Prisma.DetailInvoicesWhereInput = {};
    const dateRange = parseDateRange(fromDate, toDate);
    if (dateRange) where.createdAt = dateRange;
    if (courseId) where.courseId = courseId;
    if (teacherId) where.courses = { userId: teacherId, isDeleted: false };
    if (studentId) where.invoices = { userId: studentId };

    // Nếu đang thống kê theo giảng viên thì chỉ tính các detailInvoices từ hóa đơn đã thanh toán
    if (teacherId) where.invoices = { status: 'purchased' };

    // Tổng hợp
    const [totalAgg, items, totalCount] = await Promise.all([
      this.prisma.detailInvoices.aggregate({
        _sum: { price: true },
        _count: { id: true },
        _avg: { price: true },
        where,
      }),
      this.prisma.detailInvoices.findMany({
        where,
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
              user: { select: { id: true, fullName: true, avatar: true } },
            },
          },
          invoices: {
            select: {
              id: true,
              users: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: {
          [['createdAt', 'price'].includes(sortBy) ? sortBy : 'createdAt']:
            order === 'asc' ? 'asc' : 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.detailInvoices.count({ where }),
    ]);

    // Doanh thu theo khoảng thời gian (lấy tất cả records cho chart)
    const allForChart = await this.prisma.detailInvoices.findMany({
      where,
      select: { price: true, commissionRate: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const period = getTruncExpr(groupBy);
    const chartData = groupByPeriod(allForChart, period).map((g) => {
      const totalRevenue = g.items.reduce((sum, i) => sum + i.price, 0);
      const platformRevenue = g.items.reduce(
        (sum, i) =>
          sum + Math.floor((i.price * Number(i.commissionRate)) / 100),
        0,
      );
      return {
        period: g.period,
        totalRevenue,
        platformRevenue,
        teacherRevenue: totalRevenue - platformRevenue,
        transactionCount: g.items.length,
      };
    });

    // Enriched items
    const enrichedItems = items.map((item) => {
      const rate = Number(item.commissionRate);
      return {
        ...item,
        commissionRate: rate,
        platformEarnings: Math.floor((item.price * rate) / 100),
        teacherEarnings: Math.floor((item.price * (100 - rate)) / 100),
      };
    });

    return {
      message: 'Lấy thống kê doanh thu thành công',
      data: {
        summary: {
          totalRevenue: totalAgg._sum.price ?? 0,
          totalTransactions: totalAgg._count.id,
          avgTransactionValue: Math.round(totalAgg._avg.price ?? 0),
        },
        chart: chartData,
        items: enrichedItems,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    };
  }

  // ── Doanh thu theo giảng viên (top teachers) ─────────────────────────────

  async getRevenueByTeacher(query: QueryRevenueDto) {
    const { fromDate, toDate } = query;
    const topN = Math.max(
      1,
      Math.min(50, parseInt(query.limit as string) || 10),
    );

    const where: Prisma.DetailInvoicesWhereInput = {};
    const dateRange = parseDateRange(fromDate, toDate);
    if (dateRange) where.createdAt = dateRange;
    // Chỉ tính các detail invoices thuộc invoice đã thanh toán
    where.invoices = { status: 'purchased' };

    // Lấy tất cả detail invoices kèm teacher info
    const allInvoices = await this.prisma.detailInvoices.findMany({
      where,
      select: {
        price: true,
        commissionRate: true,
        courses: {
          select: {
            userId: true,
            user: {
              select: { id: true, fullName: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    // Group by teacher
    const teacherMap = new Map<
      string,
      {
        teacher: any;
        totalRevenue: number;
        teacherEarnings: number;
        count: number;
      }
    >();

    for (const inv of allInvoices) {
      const tid = inv.courses.userId;
      if (!teacherMap.has(tid)) {
        teacherMap.set(tid, {
          teacher: inv.courses.user,
          totalRevenue: 0,
          teacherEarnings: 0,
          count: 0,
        });
      }
      const entry = teacherMap.get(tid)!;
      entry.totalRevenue += inv.price;
      entry.teacherEarnings += Math.floor(
        (inv.price * (100 - Number(inv.commissionRate))) / 100,
      );
      entry.count += 1;
    }

    const ranked = Array.from(teacherMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, topN);

    return {
      message: 'Lấy doanh thu theo giảng viên thành công',
      data: ranked,
    };
  }

  // ── Doanh thu theo khóa học (top courses) ─────────────────────────────────

  async getRevenueByCourse(query: QueryRevenueDto) {
    const { fromDate, toDate, teacherId } = query;
    const topN = Math.max(
      1,
      Math.min(50, parseInt(query.limit as string) || 10),
    );

    const where: Prisma.DetailInvoicesWhereInput = {};
    const dateRange = parseDateRange(fromDate, toDate);
    if (dateRange) where.createdAt = dateRange;
    if (teacherId) where.courses = { userId: teacherId, isDeleted: false };

    // Nếu lọc theo giảng viên hoặc khi tính doanh thu khóa học, chỉ tính detail invoices từ hóa đơn đã thanh toán
    where.invoices = { status: 'purchased' };

    const allInvoices = await this.prisma.detailInvoices.findMany({
      where,
      select: {
        price: true,
        commissionRate: true,
        courseId: true,
        courses: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            studentCount: true,
            star: true,
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    const courseMap = new Map<
      string,
      {
        course: any;
        totalRevenue: number;
        platformRevenue: number;
        count: number;
      }
    >();

    for (const inv of allInvoices) {
      const cid = inv.courseId;
      if (!courseMap.has(cid)) {
        courseMap.set(cid, {
          course: inv.courses,
          totalRevenue: 0,
          platformRevenue: 0,
          count: 0,
        });
      }
      const entry = courseMap.get(cid)!;
      entry.totalRevenue += inv.price;
      entry.platformRevenue += Math.floor(
        (inv.price * Number(inv.commissionRate)) / 100,
      );
      entry.count += 1;
    }

    const ranked = Array.from(courseMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, topN);

    return {
      message: 'Lấy doanh thu theo khóa học thành công',
      data: ranked,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  3. THỐNG KÊ NGƯỜI DÙNG  (Admin)
  // ══════════════════════════════════════════════════════════════════════════

  async getUserStats(query: QueryUserStatDto) {
    const { fromDate, toDate, groupBy = 'month', roleName } = query;

    const where: Prisma.UserWhereInput = { isDeleted: false };
    const dateRange = parseDateRange(fromDate, toDate);
    if (dateRange) where.createdAt = dateRange;
    if (roleName)
      where.role = { name: { equals: roleName, mode: 'insensitive' } };

    const [totalUsers, bannedUsers, deletedUsers, allUsers, roleDistribution] =
      await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.count({
          where: {
            ...where,
            banId: { not: null },
            timeUnBan: { gt: new Date() },
          },
        }),
        this.prisma.user.count({ where: { isDeleted: true } }),

        // Toàn bộ users cho chart tăng trưởng
        this.prisma.user.findMany({
          where,
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),

        // Phân bố role
        this.prisma.user.groupBy({
          by: ['roleId'],
          _count: { id: true },
          where: { isDeleted: false },
        }),
      ]);

    // Map role
    const roles = await this.prisma.role.findMany({
      select: { id: true, name: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r.name]));

    // Chart: user mới theo period
    const period = getTruncExpr(groupBy);
    const registrationChart = groupByPeriod(allUsers, period).map((g) => ({
      period: g.period,
      newUsers: g.items.length,
    }));

    // Cumulative chart
    let cumulative = 0;
    const cumulativeChart = registrationChart.map((p) => {
      cumulative += p.newUsers;
      return { ...p, cumulativeTotal: cumulative };
    });

    // Top người dùng mua nhiều nhất
    const topBuyers = await this.prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: { select: { userCourses: true, invoices: true } },
      },
      orderBy: { userCourses: { _count: 'desc' } },
      take: 10,
    });

    return {
      message: 'Lấy thống kê người dùng thành công',
      data: {
        summary: {
          totalUsers,
          bannedUsers,
          deletedUsers,
        },
        roleDistribution: roleDistribution.map((g) => ({
          role: roleMap.get(g.roleId) || g.roleId,
          count: g._count.id,
        })),
        chart: cumulativeChart,
        topBuyers,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  4. THỐNG KÊ KHÓA HỌC  (Admin)
  // ══════════════════════════════════════════════════════════════════════════

  async getCourseStats(query: QueryCourseStatDto) {
    const {
      fromDate,
      toDate,
      status,
      teacherId,
      groupBy = 'month',
      sortBy = 'studentCount',
      order = 'desc',
    } = query;
    const topN = Math.max(
      1,
      Math.min(50, parseInt(query.topN as string) || 10),
    );

    const where: Prisma.CourseWhereInput = { isDeleted: false };
    const dateRange = parseDateRange(fromDate, toDate);
    if (dateRange) where.createdAt = dateRange;
    if (status) where.status = status as any;
    if (teacherId) where.userId = teacherId;

    const [
      totalCourses,
      publishedCourses,
      pendingCourses,
      coursesByStatus,
      allCourses,
    ] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.count({ where: { ...where, status: 'published' } }),
      this.prisma.course.count({ where: { ...where, status: 'pending' } }),
      this.prisma.course.groupBy({
        by: ['status'],
        _count: { id: true },
        where,
      }),
      this.prisma.course.findMany({
        where,
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Chart: khóa học mới theo period
    const period = getTruncExpr(groupBy);
    const creationChart = groupByPeriod(allCourses, period).map((g) => ({
      period: g.period,
      newCourses: g.items.length,
    }));

    // Top khóa học
    const allowedSort = ['studentCount', 'star', 'createdAt'];
    const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'studentCount';

    const topCourses = await this.prisma.course.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        thumbnail: true,
        price: true,
        star: true,
        status: true,
        studentCount: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, avatar: true } },
        _count: { select: { userCourses: true, reviews: true, lessons: true } },
      },
      orderBy: { [safeSortBy]: order === 'asc' ? 'asc' : 'desc' },
      take: topN,
    });

    // Top khóa học theo doanh thu (cần tính riêng)
    const courseRevenues = await this.prisma.detailInvoices.groupBy({
      by: ['courseId'],
      _sum: { price: true },
      _count: { id: true },
      ...(dateRange ? { where: { createdAt: dateRange } } : {}),
      orderBy: { _sum: { price: 'desc' } },
      take: topN,
    });

    const topRevenueIds = courseRevenues.map((c) => c.courseId);
    const topRevenueCourses = topRevenueIds.length
      ? await this.prisma.course.findMany({
          where: { id: { in: topRevenueIds }, isDeleted: false },
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            price: true,
            star: true,
            studentCount: true,
            user: { select: { id: true, fullName: true } },
          },
        })
      : [];

    const topByRevenue = courseRevenues.map((cr) => {
      const course = topRevenueCourses.find((c) => c.id === cr.courseId);
      return {
        course,
        totalRevenue: cr._sum.price ?? 0,
        totalSales: cr._count.id,
      };
    });

    return {
      message: 'Lấy thống kê khóa học thành công',
      data: {
        summary: {
          totalCourses,
          publishedCourses,
          pendingCourses,
        },
        statusDistribution: coursesByStatus.map((g) => ({
          status: g.status,
          count: g._count.id,
        })),
        chart: creationChart,
        topCourses,
        topByRevenue,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  5. GIẢNG VIÊN - THỐNG KÊ CÁ NHÂN (giữ lại API cũ + nâng cấp)
  // ══════════════════════════════════════════════════════════════════════════

  async getInstructorStat(instructorId: string) {
    const courses = await this.prisma.course.findMany({
      where: { userId: instructorId, isDeleted: false },
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        star: true,
        studentCount: true,
        createdAt: true,
        _count: {
          select: {
            userCourses: true,
            reviews: true,
            lessons: true,
          },
        },
      },
    });

    const [
      totalStudents,
      totalReviews,
      avgRating,
      totalRevenue,
      invoiceDetails,
    ] = await Promise.all([
      this.prisma.userCourse.count({
        where: { course: { userId: instructorId, isDeleted: false } },
      }),
      this.prisma.courseReview.count({
        where: {
          course: { userId: instructorId, isDeleted: false },
          isDeleted: false,
        },
      }),
      this.prisma.courseReview.aggregate({
        _avg: { rating: true },
        where: {
          course: { userId: instructorId, isDeleted: false },
          isDeleted: false,
        },
      }),
      this.prisma.detailInvoices.aggregate({
        _sum: { price: true },
        where: {
          courses: { userId: instructorId, isDeleted: false },
          invoices: { status: 'purchased' },
        },
      }),
      this.prisma.detailInvoices.findMany({
        where: {
          courses: { userId: instructorId, isDeleted: false },
          invoices: { status: 'purchased' },
        },
        select: {
          id: true,
          price: true,
          commissionRate: true,
          status: true,
          createdAt: true,
          courses: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Chart doanh thu theo tháng cho giảng viên
    const revenueChart = groupByPeriod(invoiceDetails, 'month').map((g) => {
      const revenue = g.items.reduce((sum, i) => sum + i.price, 0);
      const teacherRevenue = g.items.reduce(
        (sum, i) =>
          sum + Math.floor((i.price * (100 - Number(i.commissionRate))) / 100),
        0,
      );
      return {
        period: g.period,
        totalRevenue: revenue,
        teacherRevenue,
        transactionCount: g.items.length,
      };
    });

    return {
      message: 'Lấy thống kê giảng viên thành công',
      data: {
        overview: {
          totalCourses: courses.length,
          totalStudents,
          totalReviews,
          avgRating: avgRating._avg.rating ?? 0,
          totalRevenue: totalRevenue._sum.price ?? 0,
        },
        courses,
        revenueChart,
        invoiceDetails,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  6. ADMIN STAT LEGACY  (giữ tương thích API cũ)
  // ══════════════════════════════════════════════════════════════════════════

  async getAdminStat() {
    const [
      totalUsers,
      totalCourses,
      totalRevenue,
      totalTransactions,
      totalReviews,
      totalReports,
      usersByRole,
      coursesByStatus,
      courses,
      users,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.course.count({ where: { isDeleted: false } }),
      this.prisma.detailInvoices.aggregate({ _sum: { price: true } }),
      this.prisma.transaction.count({ where: { isDeleted: false } }),
      this.prisma.courseReview.count({ where: { isDeleted: false } }),
      this.prisma.courseReport.count({ where: { isDeleted: false } }),
      this.prisma.user.groupBy({
        by: ['roleId'],
        _count: { id: true },
        where: { isDeleted: false },
      }),
      this.prisma.course.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { isDeleted: false },
      }),
      this.prisma.course.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          star: true,
          studentCount: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true } },
          _count: { select: { userCourses: true, reviews: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          role: { select: { name: true } },
          _count: {
            select: { courses: true, userCourses: true, reviews: true },
          },
        },
      }),
    ]);

    return {
      message: 'Lấy thống kê admin thành công',
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalRevenue: totalRevenue._sum.price ?? 0,
          totalTransactions,
          totalReviews,
          totalReports,
        },
        usersByRole,
        coursesByStatus,
        courses,
        users,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  7. DANH SÁCH HỌC VIÊN KHÓA HỌC  (giữ API cũ)
  // ══════════════════════════════════════════════════════════════════════════

  async getCourseStudents(courseId: string, user: IUser) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { userId: true },
    });

    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
    }

    const isOwner = course.userId === user.id;
    const isAdmin = user.role?.name === ROLE_NAME.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách học viên');
    }

    const students = await this.prisma.userCourse.findMany({
      where: { courseId },
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatar: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Lấy danh sách học viên thành công',
      data: {
        total: students.length,
        students: students.map((s) => ({
          ...s.user,
          purchasedAt: s.createdAt,
        })),
      },
    };
  }
}
