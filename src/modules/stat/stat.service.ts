// stat.service.ts
import { PrismaService } from '@/infras/prisma/prisma.service';
import { ROLE_NAME } from '@/shared/constants/auth.constant';
import { IUser } from '@/shared/types/user.type';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class StatService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Giảng viên ────────────────────────────────────────────────────────────

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
            userCourses: true, // số học viên mỗi khóa
            reviews: true, // số đánh giá mỗi khóa
            lessons: true, // số bài học mỗi khóa
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
      // Tổng học viên của tất cả khóa học
      this.prisma.userCourse.count({
        where: { course: { userId: instructorId, isDeleted: false } },
      }),

      // Tổng đánh giá
      this.prisma.courseReview.count({
        where: {
          course: { userId: instructorId, isDeleted: false },
          isDeleted: false,
        },
      }),

      // Điểm đánh giá trung bình
      this.prisma.courseReview.aggregate({
        _avg: { rating: true },
        where: {
          course: { userId: instructorId, isDeleted: false },
          isDeleted: false,
        },
      }),

      // Tổng doanh thu
      this.prisma.detailInvoices.aggregate({
        _sum: { price: true },
        where: {
          courses: { userId: instructorId, isDeleted: false },
        },
      }),

      // Chi tiết hóa đơn của các khóa học thuộc giảng viên (dùng để vẽ biểu đồ)
      this.prisma.detailInvoices.findMany({
        where: {
          courses: { userId: instructorId, isDeleted: false },
        },
        select: {
          id: true,
          price: true,
          status: true,
          createdAt: true,
          courses: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

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
        courses, // client muốn top thì tự sort
        invoiceDetails, // chi tiết từng giao dịch để vẽ biểu đồ doanh thu
      },
    };
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

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
      // Tổng user
      this.prisma.user.count({ where: { isDeleted: false } }),

      // Tổng khóa học
      this.prisma.course.count({ where: { isDeleted: false } }),

      // Tổng doanh thu toàn hệ thống
      this.prisma.detailInvoices.aggregate({
        _sum: { price: true },
      }),

      // Tổng giao dịch
      this.prisma.transaction.count({ where: { isDeleted: false } }),

      // Tổng đánh giá
      this.prisma.courseReview.count({ where: { isDeleted: false } }),

      // Tổng báo cáo
      this.prisma.courseReport.count({ where: { isDeleted: false } }),

      // Phân bố user theo role
      this.prisma.user.groupBy({
        by: ['roleId'],
        _count: { id: true },
        where: { isDeleted: false },
      }),

      // Phân bố khóa học theo trạng thái
      this.prisma.course.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { isDeleted: false },
      }),

      // Danh sách khóa học kèm số liệu (client tự top)
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
          _count: {
            select: {
              userCourses: true,
              reviews: true,
            },
          },
        },
      }),

      // Danh sách user kèm số liệu
      this.prisma.user.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          role: { select: { name: true } },
          _count: {
            select: {
              courses: true, // số khóa học đã tạo (giảng viên)
              userCourses: true, // số khóa học đã mua (học viên)
              reviews: true,
            },
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
        usersByRole, // client map roleId → tên role
        coursesByStatus, // draft | pending | published
        courses, // client tự sort/top
        users, // client tự sort/top
      },
    };
  }

  // ── Khóa học ───────────────────────────────────────────────────────────────
  // courses.service.ts (thêm vào service hiện có)
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
        createdAt: true, // ngày mua
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
