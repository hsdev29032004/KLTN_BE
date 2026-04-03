import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import * as jsonwebtoken from 'jsonwebtoken';
import type { IUser } from '@/shared/types/user.type';
import { ROLE_NAME } from '@/shared/constants/auth.constant';
import { generateSlug } from '@/shared/utils/slug.util';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonMaterialDto } from './dto/create-lesson-material.dto';
import { UpdateLessonMaterialDto } from './dto/update-lesson-material.dto';
import type { MaterialType } from '@prisma/client';
import { CourseStatus, LessonStatus } from '@prisma/client';

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
      where: { isDeleted: false, status: { in: [CourseStatus.published, CourseStatus.outdated] } },
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

      // Add buyer to existing conversations
      for (const c of courses) {
        const conv = await tx.conversation.findUnique({
          where: { courseId: c.id },
        });
        if (conv) {
          const existingMember = await tx.conversationMember.findUnique({
            where: { conversationId_userId: { conversationId: conv.id, userId } },
          });
          if (!existingMember) {
            await tx.conversationMember.create({
              data: { conversationId: conv.id, userId, isHost: false },
            });
          }
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
      where: { id: { in: ids }, isDeleted: false, status: { in: [CourseStatus.published, CourseStatus.outdated] } },
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
      : { isDeleted: false, status: { in: [LessonStatus.published, LessonStatus.outdated] } };

    const materialWhere = isPrivileged
      ? { isDeleted: false }
      : { isDeleted: false, status: { in: [LessonStatus.published, LessonStatus.outdated] } };

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
      where: { id: { in: courseIds }, isDeleted: false, status: { in: [CourseStatus.published, CourseStatus.outdated] } },
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
        status: { in: [LessonStatus.published, LessonStatus.outdated] },
        lesson: {
          isDeleted: false,
          status: { in: [LessonStatus.published, LessonStatus.outdated] },
          course: {
            isDeleted: false,
            status: { in: [CourseStatus.published, CourseStatus.outdated] },
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

  // ── Create Course ─────────────────────────────────────────────────────────

  async createCourse(userId: string, dto: CreateCourseDto) {
    let slug = generateSlug(dto.name);

    // Đảm bảo slug unique
    const existing = await this.prisma.course.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const course = await this.prisma.course.create({
      data: {
        name: dto.name,
        price: dto.price,
        thumbnail: dto.thumbnail,
        content: dto.content,
        description: dto.description,
        slug,
        status: CourseStatus.draft,
        star: 0,
        studentCount: 0,
        userId,
      },
    });

    return { message: 'Tạo khóa học thành công', data: course };
  }

  // ── Create Lesson ─────────────────────────────────────────────────────────

  async createLesson(userId: string, courseId: string, dto: CreateLessonDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    const lesson = await this.prisma.lesson.create({
      data: {
        name: dto.name,
        courseId,
        status: LessonStatus.draft,
      },
    });

    return { message: 'Tạo bài học thành công', data: lesson };
  }

  // ── Create Lesson Material ────────────────────────────────────────────────

  async createLessonMaterial(userId: string, lessonId: string, dto: CreateLessonMaterialDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { course: { select: { userId: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    if (lesson.course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác bài học này');

    const material = await this.prisma.lessonMaterial.create({
      data: {
        name: dto.name,
        url: dto.url,
        type: dto.type as MaterialType,
        lessonId,
        status: LessonStatus.draft,
      },
    });

    return { message: 'Tạo tài liệu thành công', data: material };
  }

  // ── Update Course ─────────────────────────────────────────────────────────

  async updateCourse(userId: string, courseId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    const data: any = { ...dto };

    // Nếu đổi tên thì cập nhật slug
    if (dto.name && dto.name !== course.name) {
      let slug = generateSlug(dto.name);
      const existing = await this.prisma.course.findFirst({
        where: { slug, id: { not: courseId } },
      });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      data.slug = slug;
    }

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data,
    });

    return { message: 'Cập nhật khóa học thành công', data: updated };
  }

  // ── Update Lesson ─────────────────────────────────────────────────────────

  async updateLesson(userId: string, lessonId: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { course: { select: { userId: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    if (lesson.course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác bài học này');

    const updated = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { ...dto },
    });

    return { message: 'Cập nhật bài học thành công', data: updated };
  }

  // ── Update Lesson Material (outdate logic) ────────────────────────────────

  async updateLessonMaterial(userId: string, materialId: string, dto: UpdateLessonMaterialDto) {
    const material = await this.prisma.lessonMaterial.findFirst({
      where: { id: materialId, isDeleted: false },
      include: { lesson: { include: { course: { select: { userId: true } } } } },
    });
    if (!material) throw new NotFoundException('Tài liệu không tồn tại');
    if (material.lesson.course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác tài liệu này');

    // Nếu material đã published thì set cũ thành outdated và tạo bản ghi mới (draft)
    if (material.status === LessonStatus.published) {
      const [, newMaterial] = await this.prisma.$transaction([
        this.prisma.lessonMaterial.update({
          where: { id: materialId },
          data: { status: LessonStatus.outdated },
        }),
        this.prisma.lessonMaterial.create({
          data: {
            name: dto.name ?? material.name,
            url: dto.url ?? material.url,
            type: (dto.type as MaterialType) ?? material.type,
            lessonId: material.lessonId,
            isPreview: material.isPreview,
            status: LessonStatus.draft,
          },
        }),
      ]);

      return { message: 'Cập nhật tài liệu thành công (tạo bản mới)', data: newMaterial };
    }

    // Nếu chưa published thì cập nhật trực tiếp
    const updated = await this.prisma.lessonMaterial.update({
      where: { id: materialId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.type !== undefined && { type: dto.type as MaterialType }),
      },
    });

    return { message: 'Cập nhật tài liệu thành công', data: updated };
  }

  // ── Delete Course ─────────────────────────────────────────────────────────

  async deleteCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    await this.prisma.$transaction([
      this.prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.outdated, isDeleted: true, deletedAt: new Date() },
      }),
      this.prisma.lesson.updateMany({
        where: { courseId, isDeleted: false },
        data: { status: LessonStatus.outdated, isDeleted: true, deletedAt: new Date() },
      }),
      this.prisma.lessonMaterial.updateMany({
        where: { lesson: { courseId }, isDeleted: false },
        data: { status: LessonStatus.outdated, isDeleted: true, deletedAt: new Date() },
      }),
    ]);

    return { message: 'Xóa khóa học thành công' };
  }

  // ── Delete Lesson ─────────────────────────────────────────────────────────

  async deleteLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { course: { select: { userId: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    if (lesson.course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác bài học này');

    await this.prisma.$transaction([
      this.prisma.lesson.update({
        where: { id: lessonId },
        data: { status: LessonStatus.outdated },
      }),
      this.prisma.lessonMaterial.updateMany({
        where: { lessonId, isDeleted: false },
        data: { status: LessonStatus.outdated },
      }),
    ]);

    return { message: 'Xóa bài học thành công' };
  }

  // ── Delete Lesson Material ────────────────────────────────────────────────

  async deleteLessonMaterial(userId: string, materialId: string) {
    const material = await this.prisma.lessonMaterial.findFirst({
      where: { id: materialId, isDeleted: false },
      include: { lesson: { include: { course: { select: { userId: true } } } } },
    });
    if (!material) throw new NotFoundException('Tài liệu không tồn tại');
    if (material.lesson.course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác tài liệu này');

    await this.prisma.lessonMaterial.update({
      where: { id: materialId },
      data: { status: LessonStatus.outdated, isDeleted: material.status === "draft" },
    });

    return { message: 'Xóa tài liệu thành công' };
  }

  // ── Submit for Review ─────────────────────────────────────────────────────

  async submitForReview(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      include: {
        lessons: {
          where: { isDeleted: false },
          include: {
            materials: { where: { isDeleted: false } },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId) throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    if (course.status === CourseStatus.published) {
      // Kiểm tra xem có item nào chưa published không
      const hasUnpublished =
        course.lessons.some((l) => l.status !== LessonStatus.published) ||
        course.lessons.some((l) =>
          l.materials.some((m) => m.status !== LessonStatus.published),
        );

      if (!hasUnpublished) {
        throw new BadRequestException('Không có nội dung nào cần xét duyệt');
      }

      await this.prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.update },
      });

      return { message: 'Gửi xét duyệt cập nhật khóa học thành công' };
    }

    // Khóa học chưa published → chuyển sang pending
    if (course.status === CourseStatus.draft || course.status === CourseStatus.outdated) {
      await this.prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.pending },
      });

      return { message: 'Gửi xét duyệt khóa học thành công' };
    }

    throw new BadRequestException('Khóa học đang ở trạng thái không thể gửi xét duyệt');
  }

  // ── Admin Publish Course ──────────────────────────────────────────────────

  async publishCourse(adminId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      include: {
        lessons: {
          where: { isDeleted: false },
          include: {
            materials: { where: { isDeleted: false } },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    if (course.status !== CourseStatus.pending && course.status !== CourseStatus.update) {
      throw new BadRequestException('Khóa học không ở trạng thái chờ duyệt');
    }

    const isFirstPublish = course.publishedAt === null;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Update course status
      await tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.published,
          publishedBy: adminId,
          publishedAt: isFirstPublish ? now : course.publishedAt,
        },
      });

      // Publish all draft/pending lessons and materials
      for (const lesson of course.lessons) {
        if (lesson.status !== LessonStatus.published) {
          await tx.lesson.update({
            where: { id: lesson.id },
            data: { status: LessonStatus.published, publisherId: adminId, publishedAt: now },
          });
        }
        for (const material of lesson.materials) {
          if (material.status !== LessonStatus.published) {
            await tx.lessonMaterial.update({
              where: { id: material.id },
              data: { status: LessonStatus.published, publisherId: adminId, publishedAt: now },
            });
          }
        }
      }

      // Tạo hội thoại khi published lần đầu tiên
      if (isFirstPublish) {
        const conversation = await tx.conversation.create({
          data: {
            courseId,
            name: course.name,
          },
        });

        // Add giảng viên vào hội thoại với isHost = true
        await tx.conversationMember.create({
          data: {
            conversationId: conversation.id,
            userId: course.userId,
            isHost: true,
          },
        });
      }
    });

    return { message: 'Duyệt khóa học thành công' };
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
