import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import * as jsonwebtoken from 'jsonwebtoken';
import type { IUser } from '@/shared/types/user.type';
import { ROLE_NAME } from '@/shared/constants/auth.constant';

const COURSE_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  thumbnail: true,
  price: true,
  star: true,
  status: true,
  studentCount: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      avatar: true,
    },
  },
  courseTopics: {
    include: {
      topic: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
};

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    const courses = await this.prisma.course.findMany({
      where: { isDeleted: false, status: 'published' },
      select: COURSE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return { message: 'Lấy danh sách khóa học thành công', data: courses };
  }

  async purchaseCourses(userId: string, courseIds: string[]) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      throw new BadRequestException('Danh sách khóa học rỗng');
    }

    // Check already purchased
    const already = await this.prisma.userCourse.findMany({
      where: { userId, courseId: { in: courseIds } },
      select: { courseId: true },
    });

    if (already.length > 0) {
      throw new BadRequestException('Tồn tại khóa học đã mua');
    }

    // Load courses and validate
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, isDeleted: false },
      select: { id: true, price: true, userId: true },
    });

    if (courses.length !== courseIds.length) {
      throw new NotFoundException('Có khóa học không tồn tại');
    }

    const total = courses.reduce(
      (sum, course) => sum + Number(course.price),
      0,
    );

    const [user, system] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, availableAmount: true },
      }),
      this.prisma.system.findUnique({
        where: { id: 'system' },
        select: { comissionRate: true },
      }),
    ]);

    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    if (!system) throw new NotFoundException('Hệ thống chưa được cấu hình');

    if ((user.availableAmount ?? 0) < total) {
      throw new BadRequestException('Không đủ số dư');
    }

    const commissionRate = Number(system.comissionRate);

    const result = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.invoices.create({
        data: { userId, amount: total },
      });

      const details = await Promise.all(
        courses.map((c) =>
          tx.detailInvoices.create({
            data: {
              coursePurchaseId: purchase.id,
              courseId: c.id,
              price: c.price,
              status: 'paid',
            },
          }),
        ),
      );

      const userCourses = await Promise.all(
        courses.map((c) =>
          tx.userCourse.create({ data: { userId, courseId: c.id } }),
        ),
      );

      // Ensure conversation exists for each course
      for (const c of courses) {
        const conv = await tx.conversation.findUnique({
          where: { courseId: c.id },
        });
        if (!conv) {
          await tx.conversation.create({ data: { courseId: c.id } });
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: { availableAmount: { decrement: total } },
      });

      // Credit each course owner based on commission rate
      for (const c of courses) {
        const ownerEarning = Math.floor(Number(c.price) * commissionRate / 100);
        await tx.user.update({
          where: { id: c.userId },
          data: { availableAmount: { increment: ownerEarning } },
        });
      }

      return { purchase, details, userCourses };
    });

    return { message: 'Mua khóa học thành công', data: result };
  }

  async findByIds(ids: string[]) {
    const courses = await this.prisma.course.findMany({
      where: { id: { in: ids }, isDeleted: false, status: 'published' },
      select: COURSE_LIST_SELECT,
    });

    return {
      message: 'Lấy danh sách khóa học theo danh sách ID thành công',
      data: courses,
    };
  }

  async findByUserId(userId: string) {
    const courses = await this.prisma.course.findMany({
      where: { userId, isDeleted: false },
      select: COURSE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Lấy danh sách khóa học theo user thành công',
      data: courses,
    };
  }

  async findBySlugOrId(key: string, user: IUser) {
    // Fetch a lightweight version first to determine ownership
    const courseBasic = await this.prisma.course.findFirst({
      where: { OR: [{ slug: key }, { id: key }], isDeleted: false },
      select: { id: true, userId: true },
    });

    if (!courseBasic) throw new NotFoundException('Khóa học không tồn tại');

    // Determine privileged access before building the full query
    const isOwner = !!user && user.id === courseBasic.userId;
    const isSpecialRole = !!user && !!user.role?.name &&
      user.role.name !== ROLE_NAME.USER &&
      user.role.name !== ROLE_NAME.TEACHER;
    const isPrivileged = isOwner || isSpecialRole;

    const lessonWhere = isPrivileged
      ? { isDeleted: false }
      : { isDeleted: false, status: 'published' as const };

    const materialWhere = isPrivileged
      ? { isDeleted: false }
      : { isDeleted: false, status: 'published' as const };

    const course: any = await this.prisma.course.findUnique({
      where: { id: courseBasic.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            slug: true,
            avatar: true,
            email: true,
          },
        },
        publisher: {
          select: {
            id: true,
            fullName: true,
            slug: true,
            avatar: true,
          },
        },
        courseTopics: {
          include: {
            topic: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        lessons: {
          where: lessonWhere,
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            materials: {
              where: materialWhere,
              select: {
                id: true,
                name: true,
                type: true,
                isPreview: true,
                status: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { reviews: true, userCourses: true },
        },
        reviews: {
          where: { isDeleted: false },
          select: {
            id: true,
            rating: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            reviewer: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // For non-privileged users, additionally check if they purchased the course
    let allowFullAccess = isPrivileged;
    if (!allowFullAccess && user) {
      const purchased = await this.prisma.userCourse.findFirst({
        where: { courseId: course.id, userId: user.id },
      });
      if (purchased) allowFullAccess = true;
    }

    return { message: 'Lấy thông tin khóa học thành công', data: course, canAccess: allowFullAccess };
  }

  async findMyCourses(userId: string) {
    // Lấy courseId từ UserCourse rồi truy vấn Course tương ứng (giữ format giống findAll)
    const userCourses = await this.prisma.userCourse.findMany({
      where: { userId },
      select: { courseId: true },
    });

    const courseIds = userCourses.map((uc) => uc.courseId);
    if (courseIds.length === 0) {
      return { message: 'Lấy danh sách khóa học đã mua thành công', data: [] };
    }

    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, isDeleted: false, status: 'published' },
      select: COURSE_LIST_SELECT as any,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Lấy danh sách khóa học đã mua thành công',
      data: courses,
    };
  }

  async getMaterial(materialId: string, user?: IUser) {
    const lessonMaterial = await this.prisma.lessonMaterial.findFirst({
      where: {
        id: materialId,
        isDeleted: false,
        status: 'published',
        lesson: {
          isDeleted: false,
          status: 'published',
          course: {
            isDeleted: false,
            status: 'published',
          },
        },
      },
      include: {
        lesson: {
          include: {
            course: {
              include: { userCourses: { select: { userId: true } } },
            },
          },
        },
      },
    });

    if (!lessonMaterial) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    // ── Kiểm tra quyền truy cập ──────────────────────────────────────────────

    const hasAccess = this.checkAccess(lessonMaterial, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn chưa mua khóa học này');
    }

    // ── Trả về response theo loại tài liệu ───────────────────────────────────

    if (lessonMaterial.type !== 'video') {
      return {
        message: 'Lấy đường dẫn tài liệu thành công',
        data: { url: lessonMaterial.url },
      };
    }

    // Nếu là preview cho phép playback mà không cần mua
    if (lessonMaterial.isPreview) {
      return this.buildPlaybackResponse(lessonMaterial, user?.id);
    }

    // Nếu không phải preview, cần có user và kiểm tra quyền
    if (!user) {
      throw new NotFoundException(
        'Tài liệu không tồn tại hoặc bạn chưa mua khóa học này',
      );
    }

    // Nếu user là chủ khóa học (instructor) => cho phép
    const courseOwnerId = lessonMaterial.lesson?.course?.userId;
    if (user.id === courseOwnerId) {
      return this.buildPlaybackResponse(lessonMaterial, user?.id);
    }

    // Nếu role không phải 'user' hoặc 'teacher' => cho phép (ví dụ admin)
    const roleName = user.role?.name;
    if (roleName && roleName !== ROLE_NAME.USER && roleName !== ROLE_NAME.TEACHER) {
      return this.buildPlaybackResponse(lessonMaterial, user?.id);
    }

    // Cuối cùng kiểm tra đã mua chưa
    const purchased = !!lessonMaterial.lesson?.course?.userCourses?.some(
      (uc) => uc.userId === user.id,
    );
    if (!purchased) {
      throw new NotFoundException(
        'Tài liệu không tồn tại hoặc bạn chưa mua khóa học này',
      );
    }

    return this.buildPlaybackResponse(lessonMaterial, user?.id);
  }

  private buildPlaybackResponse(lessonMaterial: any, userId?: string) {
    // Nếu không phải video thì trả về url trực tiếp
    if (lessonMaterial.type !== 'video') {
      return {
        message: 'Lấy đường dẫn tài liệu thành công',
        data: { url: lessonMaterial.url },
      };
    }

    const playbackToken = { path: `lesson-${lessonMaterial.url}`, userId };
    const token = jsonwebtoken.sign(
      playbackToken,
      process.env.VIDEO_TOKEN_SECRET_KEY || '',
    );
    return {
      message: 'Lấy token phát lại thành công',
      data: { token, url: lessonMaterial.url },
    };
  }

  private checkAccess(lessonMaterial: any, user?: IUser): boolean {
    // 1. Preview → ai cũng xem được, không cần đăng nhập
    if (lessonMaterial.isPreview) {
      console.log(lessonMaterial.isPreview, 'isPreview');

      return true;
    }

    // Từ đây bắt buộc phải có user
    if (!user) {
      console.log(2);
      return false;
    }

    // 2. Owner của khóa học → cho phép
    const courseOwnerId = lessonMaterial.lesson?.course?.userId;
    if (user.id === courseOwnerId) {
      console.log(3);
      return true;
    }

    // 3. Admin / role đặc biệt (không phải user / teacher) → cho phép
    const roleName = user.role?.name;
    console.log(user.role);

    if (roleName && roleName !== ROLE_NAME.USER && roleName !== ROLE_NAME.TEACHER) {
      console.log(4);
      return true;
    }

    // 4. Đã mua khóa học → cho phép
    const purchased = lessonMaterial.lesson?.course?.userCourses?.some(
      (uc: any) => uc.userId === user.id,
    );
    return !!purchased;
  }
}
