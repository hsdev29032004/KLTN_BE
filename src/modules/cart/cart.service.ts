import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Thêm khóa học vào giỏ hàng ───────────────────────────────────────────

  async addToCart(userId: string, courseIds: string[]) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      throw new BadRequestException('Danh sách khóa học rỗng');
    }

    // Validate courses exist and are published
    const courses = await this.prisma.course.findMany({
      where: {
        id: { in: courseIds },
        isDeleted: false,
        status: { in: [CourseStatus.published, CourseStatus.update, CourseStatus.need_update] },
      },
      select: { id: true, userId: true },
    });

    const validIds = courses.map((c) => c.id);
    if (validIds.length === 0) {
      throw new BadRequestException('Không có khóa học hợp lệ');
    }

    // Loại bỏ khóa học đã mua
    const purchased = await this.prisma.userCourse.findMany({
      where: { userId, courseId: { in: validIds } },
      select: { courseId: true },
    });
    const purchasedIds = new Set(purchased.map((p) => p.courseId));

    // Loại bỏ khóa học của chính mình
    const ownCourseIds = new Set(courses.filter((c) => c.userId === userId).map((c) => c.id));

    const toAdd = validIds.filter((id) => !purchasedIds.has(id) && !ownCourseIds.has(id));

    if (toAdd.length === 0) {
      return { message: 'Không có khóa học mới để thêm vào giỏ hàng', data: { added: 0 } };
    }

    // Chỉ thêm các id chưa có trong giỏ
    const existing = await this.prisma.cartItem.findMany({
      where: { userId, courseId: { in: toAdd } },
      select: { courseId: true },
    });
    const existingIds = new Set(existing.map((e) => e.courseId));
    const newIds = toAdd.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      await this.prisma.cartItem.createMany({
        data: newIds.map((courseId) => ({ userId, courseId })),
        skipDuplicates: true,
      });
    }

    return {
      message: `Đã thêm ${newIds.length} khóa học vào giỏ hàng`,
      data: { added: newIds.length, skipped: toAdd.length - newIds.length },
    };
  }

  // ── Xóa khóa học khỏi giỏ hàng ──────────────────────────────────────────

  async removeFromCart(userId: string, courseIds: string[]) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      throw new BadRequestException('Danh sách khóa học rỗng');
    }

    const result = await this.prisma.cartItem.deleteMany({
      where: { userId, courseId: { in: courseIds } },
    });

    return {
      message: `Đã xóa ${result.count} khóa học khỏi giỏ hàng`,
      data: { removed: result.count },
    };
  }

  // ── Lấy giỏ hàng ─────────────────────────────────────────────────────────

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            price: true,
            star: true,
            status: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPrice = items.reduce((sum, item) => sum + item.course.price, 0);

    return {
      message: 'Lấy giỏ hàng thành công',
      data: {
        items: items.map((item) => ({
          id: item.id,
          courseId: item.courseId,
          addedAt: item.createdAt,
          course: item.course,
        })),
        totalPrice,
        count: items.length,
      },
    };
  }
}
