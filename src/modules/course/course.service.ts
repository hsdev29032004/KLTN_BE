import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import * as jsonwebtoken from 'jsonwebtoken';
import type { IUser } from '@/shared/types/user.type';
import { ROLE_NAME } from '@/shared/constants/auth.constant';
import { generateSlug } from '@/shared/utils/slug.util';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { SearchCourseDto } from './dto/search-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonMaterialDto } from './dto/create-lesson-material.dto';
import { UpdateLessonMaterialDto } from './dto/update-lesson-material.dto';
import type { MaterialType } from '@prisma/client';
import { CourseStatus, LessonStatus } from '@prisma/client';
import { VNPay, ignoreLogger, VnpLocale, HashAlgorithm, dateFormat } from 'vnpay';
import { CloudinaryService } from '@/modules/cloudinary/cloudinary.service';

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
  constructor(private readonly prisma: PrismaService, private readonly cloudinary: CloudinaryService) { }

  private isImageType(type?: string) {
    if (!type) return false;
    const t = type.toLowerCase();
    return t === 'image' || t === 'img';
  }

  async findAll() {
    const courses = await this.prisma.course.findMany({
      where: {
        isDeleted: false,
        status: { in: [CourseStatus.published, CourseStatus.update, CourseStatus.need_update] },
      },
      select: COURSE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return { message: 'Lấy danh sách khóa học thành công', data: courses };
  }

  async searchCourses(dto: SearchCourseDto) {
    const {
      name,
      teacherId,
      teacherName,
      topicId,
      topicIds,
      minPrice,
      maxPrice,
      minStar,
      maxStar,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = dto;

    // Coerce numeric-like query params to numbers because query strings may remain as strings
    const minPriceNum = minPrice !== undefined && minPrice !== null ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice !== undefined && maxPrice !== null ? Number(maxPrice) : undefined;
    const minStarNum = minStar !== undefined && minStar !== null ? Number(minStar) : undefined;
    const maxStarNum = maxStar !== undefined && maxStar !== null ? Number(maxStar) : undefined;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));

    const where: any = {
      isDeleted: false,
      status: { in: [CourseStatus.published, CourseStatus.update, CourseStatus.need_update] },
    };

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (teacherId) {
      where.userId = teacherId;
    }

    if (teacherName) {
      where.user = { fullName: { contains: teacherName, mode: 'insensitive' } };
    }

    if (topicIds && Array.isArray(topicIds) && topicIds.length > 0) {
      where.courseTopics = { some: { topicId: { in: topicIds } } };
    } else if (topicId) {
      where.courseTopics = { some: { topicId } };
    }

    if (minPriceNum !== undefined || maxPriceNum !== undefined) {
      where.price = {};
      if (!Number.isNaN(minPriceNum)) where.price.gte = minPriceNum;
      if (!Number.isNaN(maxPriceNum)) where.price.lte = maxPriceNum;
    }

    if (minStarNum !== undefined || maxStarNum !== undefined) {
      where.star = {};
      if (!Number.isNaN(minStarNum)) where.star.gte = minStarNum;
      if (!Number.isNaN(maxStarNum)) where.star.lte = maxStarNum;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: COURSE_LIST_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      message: 'Tìm kiếm khóa học thành công',
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findAllForAdmin(query: Record<string, string>) {
    const {
      status,
      userId,
      page = '1',
      limit = '20',
    } = query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

    const where: any = { isDeleted: false };

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        select: {
          ...COURSE_LIST_SELECT,
          description: true,
          publishedAt: true,
          approvals: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              description: true,
              reason: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      message: 'Lấy danh sách khóa học thành công',
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async purchaseCourses(userId: string, courseIds: string[], ipAddr: string) {
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

    const system = await this.prisma.system.findUnique({
      where: { id: 'system' },
      select: { comissionRate: true },
    });

    if (!system) throw new NotFoundException('Hệ thống chưa được cấu hình');

    // Tạo hóa đơn pending + chi tiết hóa đơn
    const invoice = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.invoices.create({
        data: {
          userId,
          amount: total,
          status: 'pending',
        },
      });

      await Promise.all(
        courses.map((c) =>
          tx.detailInvoices.create({
            data: {
              coursePurchaseId: purchase.id,
              courseId: c.id,
              price: c.price,
              commissionRate: system.comissionRate,
              status: 'pending',
            },
          }),
        ),
      );

      return purchase;
    });

    // Tạo link VNPay
    const vnpay = new VNPay({
      tmnCode: process.env.VNPAY_TMN_CODE || '',
      secureSecret: process.env.VNPAY_SECRET_KEY || '',
      vnpayHost: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      testMode: true,
      hashAlgorithm: HashAlgorithm.SHA512,
      loggerFn: ignoreLogger,
    });

    const txnRef = `${invoice.id}_${Date.now()}`;
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 30);

    // Normalize IP
    const normalizedIp = ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1' || !ipAddr
      ? '127.0.0.1'
      : ipAddr.replace(/^::ffff:/, '');

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: total,
      vnp_IpAddr: normalizedIp,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `${invoice.id}|purchase`,
      vnp_ReturnUrl: `${process.env.BE_DOMAIN || 'http://localhost:3001'}/api/payment/vnpay-return`,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(expireAt),
    });

    // Lưu txnRef vào invoice
    await this.prisma.invoices.update({
      where: { id: invoice.id },
      data: { vnpayTxnRef: txnRef },
    });

    return {
      message: 'Tạo đơn hàng thành công',
      data: {
        invoiceId: invoice.id,
        amount: total,
        paymentUrl,
      },
    };
  }

  // ── Xử lý callback VNPay khi thanh toán thành công ────────────────────────

  async handlePaymentSuccess(invoiceId: string) {
    const invoice = await this.prisma.invoices.findFirst({
      where: { id: invoiceId, status: 'pending' },
      include: {
        detail_invoices: {
          select: { courseId: true },
        },
      },
    });

    if (!invoice) return; // Đã xử lý rồi hoặc không tìm thấy

    const userId = invoice.userId;
    const courseIds = invoice.detail_invoices.map((d) => d.courseId);

    await this.prisma.$transaction(async (tx) => {
      // Cập nhật invoice → purchased
      await tx.invoices.update({
        where: { id: invoiceId },
        data: { status: 'purchased' },
      });

      // Cập nhật detail invoices → paid
      await tx.detailInvoices.updateMany({
        where: { coursePurchaseId: invoiceId },
        data: { status: 'paid' },
      });

      // Tạo UserCourse
      for (const courseId of courseIds) {
        const exists = await tx.userCourse.findFirst({
          where: { userId, courseId },
        });
        if (!exists) {
          await tx.userCourse.create({ data: { userId, courseId } });
        }
      }

      // Cập nhật studentCount
      await Promise.all(
        courseIds.map((courseId) =>
          tx.course.update({
            where: { id: courseId },
            data: { studentCount: { increment: 1 } },
          }),
        ),
      );

      // Add buyer to conversations
      for (const courseId of courseIds) {
        const conv = await tx.conversation.findUnique({
          where: { courseId },
        });
        if (conv) {
          const existingMember = await tx.conversationMember.findUnique({
            where: {
              conversationId_userId: { conversationId: conv.id, userId },
            },
          });
          if (!existingMember) {
            await tx.conversationMember.create({
              data: { conversationId: conv.id, userId, isHost: false },
            });
          }
        }
      }

      // Xóa các khóa học đã mua khỏi giỏ hàng
      await tx.cartItem.deleteMany({
        where: { userId, courseId: { in: courseIds } },
      });
    });
  }

  async handlePaymentFailed(invoiceId: string) {
    await this.prisma.invoices.updateMany({
      where: { id: invoiceId, status: 'pending' },
      data: { status: 'failed' },
    });
    await this.prisma.detailInvoices.updateMany({
      where: { coursePurchaseId: invoiceId },
      data: { status: 'failed' },
    });
  }

  async findByIds(ids: string[]) {
    const courses = await this.prisma.course.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
        status: { in: [CourseStatus.published, CourseStatus.update, CourseStatus.need_update] },
      },
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
    const isSpecialRole =
      !!user &&
      !!user.role?.name &&
      user.role.name !== ROLE_NAME.USER &&
      user.role.name !== ROLE_NAME.TEACHER;
    const isPrivileged = isOwner || isSpecialRole;

    const lessonWhere = isPrivileged
      ? { isDeleted: false }
      : {
        isDeleted: false,
        status: { in: [LessonStatus.published, LessonStatus.outdated] },
      };

    const materialWhere = isPrivileged
      ? { isDeleted: false }
      : {
        isDeleted: false,
        status: { in: [LessonStatus.published, LessonStatus.outdated] },
      };

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
        approvals: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            description: true,
            reason: true,
            createdAt: true,
            updatedAt: true,
            teacher: {
              select: { id: true, fullName: true, avatar: true },
            },
            admin: {
              select: { id: true, fullName: true, avatar: true },
            },
          },
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
        exams: {
          where: isPrivileged
            ? { isDeleted: false }
            : { isDeleted: false, status: { in: [LessonStatus.published, LessonStatus.outdated] } },
          select: {
            id: true,
            name: true,
            passPercent: true,
            retryAfterDays: true,
            questionCount: true,
            duration: true,
            status: true,
            createdAt: true,
            _count: { select: { questions: { where: { isDeleted: false } } } },
          },
          orderBy: { createdAt: 'asc' },
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

    return {
      message: 'Lấy thông tin khóa học thành công',
      data: course,
      canAccess: allowFullAccess,
    };
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
      where: {
        id: { in: courseIds },
        isDeleted: false,
        status: { in: [CourseStatus.published, CourseStatus.update, CourseStatus.need_update] },
      },
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
        lesson: {
          isDeleted: false,
          course: { isDeleted: false },
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

    // Determine if user is privileged (owner or admin)
    const courseOwnerId = lessonMaterial.lesson?.course?.userId;
    const isOwner = !!user && user.id === courseOwnerId;
    const roleName = user?.role?.name;
    const isPrivileged =
      isOwner ||
      (!!roleName &&
        roleName !== ROLE_NAME.USER &&
        roleName !== ROLE_NAME.TEACHER);

    // For non-privileged users, enforce status restrictions
    if (!isPrivileged) {
      const validLessonStatuses: LessonStatus[] = [
        LessonStatus.published,
        LessonStatus.outdated,
      ];
      const validCourseStatuses: CourseStatus[] = [
        CourseStatus.published,
        CourseStatus.update,
        CourseStatus.need_update,
      ];
      if (
        !validLessonStatuses.includes(lessonMaterial.status) ||
        !validLessonStatuses.includes(
          lessonMaterial.lesson?.status as LessonStatus,
        ) ||
        !validCourseStatuses.includes(
          lessonMaterial.lesson?.course?.status as CourseStatus,
        )
      ) {
        throw new NotFoundException('Tài liệu không tồn tại');
      }
    }

    // ── Kiểm tra quyền truy cập ──────────────────────────────────────────────

    const hasAccess = this.checkAccess(lessonMaterial, user);
    if (!hasAccess) {
      throw new ForbiddenException('Bạn chưa mua khóa học này');
    }

    // ── Kiểm tra đề thi chặn (exam gate) ─────────────────────────────────────
    // Chỉ áp dụng cho user đã mua khóa học (không phải owner/admin)
    if (user && !isPrivileged) {
      const purchased = lessonMaterial.lesson?.course?.userCourses?.some(
        (uc: any) => uc.userId === user.id,
      );
      if (purchased) {
        const blocked = await this.isBlockedByExam(
          lessonMaterial.lesson.courseId,
          lessonMaterial.lesson.createdAt,
          user.id,
        );
        if (blocked) {
          throw new ForbiddenException(
            'Bạn cần hoàn thành đề thi trước khi xem tài liệu này',
          );
        }
      }
    }

    // ── Trả về response theo loại tài liệu ───────────────────────────────────

    if (lessonMaterial.type !== 'video') {
      return {
        message: 'Lấy đường dẫn tài liệu thành công',
        data: { url: lessonMaterial.url },
      };
    }

    // Quyền truy cập đã được xác nhận bởi checkAccess → cho phép phát video
    return this.buildPlaybackResponse(lessonMaterial, user?.id);
  }

  // ── Create Course ─────────────────────────────────────────────────────────

  async createCourse(userId: string, dto: CreateCourseDto, thumbnailFile?: Express.Multer.File) {
    let slug = generateSlug(dto.name);

    // Đảm bảo slug unique
    const existing = await this.prisma.course.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // If a file was uploaded, store it on Cloudinary and use the returned URL
    let thumbnailUrl = dto.thumbnail;

    // Coerce price to number when provided via FormData (frontend may send it as string)
    let priceNum: number | undefined = undefined;
    if (dto.price !== undefined && dto.price !== null) {
      priceNum = Number(dto.price as any);
      if (Number.isNaN(priceNum)) throw new BadRequestException('Giá không hợp lệ');
    }
    if (thumbnailFile) {
      const uploaded = await this.cloudinary.uploadFile(thumbnailFile, 'courses');
      thumbnailUrl = uploaded.url;
    }

    const course = await this.prisma.course.create({
      data: {
        name: dto.name,
        price: priceNum as number,
        thumbnail: thumbnailUrl,
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
    if (course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    // Không cho phép thao tác khi khóa học đang chờ duyệt hoặc đang chờ cập nhật
    if (course.status === CourseStatus.pending || course.status === CourseStatus.update) {
      throw new BadRequestException('Không thể thêm bài học khi khóa học đang chờ phê duyệt');
    }

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

  async createLessonMaterial(
    userId: string,
    lessonId: string,
    dto: CreateLessonMaterialDto,
    file?: Express.Multer.File,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { course: { select: { userId: true, status: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    if (lesson.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác bài học này');

    // Không cho phép thao tác khi khóa học đang chờ duyệt hoặc đang chờ cập nhật
    if (lesson.course.status === CourseStatus.pending || lesson.course.status === CourseStatus.update) {
      throw new BadRequestException('Không thể thêm tài liệu khi khóa học đang chờ phê duyệt');
    }

    // If material is an image and a file was uploaded, use Cloudinary
    let url = dto.url;
    if (this.isImageType(dto.type as string) && file) {
      const uploaded = await this.cloudinary.uploadFile(file, 'materials');
      url = uploaded.url;
    }

    if (!url) {
      throw new BadRequestException('Trường "url" là bắt buộc cho tài liệu');
    }

    const material = await this.prisma.lessonMaterial.create({
      data: {
        name: dto.name,
        url,
        type: dto.type as MaterialType,
        lessonId,
        status: LessonStatus.draft,
      },
    });

    return { message: 'Tạo tài liệu thành công', data: material };
  }

  // ── Update Course ─────────────────────────────────────────────────────────

  async updateCourse(userId: string, courseId: string, dto: UpdateCourseDto, thumbnailFile?: Express.Multer.File) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    const data: any = { ...dto };

    // Coerce price to number for updates (FormData sends strings)
    if (dto.price !== undefined && dto.price !== null) {
      const p = Number(dto.price as any);
      if (Number.isNaN(p)) throw new BadRequestException('Giá không hợp lệ');
      data.price = p;
    }

    if (thumbnailFile) {
      const uploaded = await this.cloudinary.uploadFile(thumbnailFile, 'courses');
      data.thumbnail = uploaded.url;
    }

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
      include: { course: { select: { userId: true, status: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    if (lesson.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác bài học này');

    // Không cho phép chỉnh sửa khi khóa học đang chờ duyệt hoặc đang chờ cập nhật
    const courseStatus = (lesson.course.status as CourseStatus);
    if (courseStatus === CourseStatus.pending || courseStatus === CourseStatus.update) {
      throw new BadRequestException('Không thể chỉnh sửa bài học khi khóa học đang chờ phê duyệt');
    }

    const updated = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { ...dto },
    });

    return { message: 'Cập nhật bài học thành công', data: updated };
  }

  // ── Update Lesson Material (outdate logic) ────────────────────────────────

  async updateLessonMaterial(
    userId: string,
    materialId: string,
    dto: UpdateLessonMaterialDto,
    file?: Express.Multer.File,
  ) {
    const material = await this.prisma.lessonMaterial.findFirst({
      where: { id: materialId, isDeleted: false },
      include: {
        lesson: {
          include: {
            course: { select: { userId: true, status: true } },
          },
        },
      },
    });
    if (!material) throw new NotFoundException('Tài liệu không tồn tại');
    if (material.lesson.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác tài liệu này');

    const courseStatus = material.lesson.course.status as CourseStatus;
    if (
      courseStatus === CourseStatus.pending ||
      courseStatus === CourseStatus.update
    ) {
      throw new BadRequestException(
        'Không thể chỉnh sửa tài liệu khi khóa học đang chờ phê duyệt',
      );
    }

    // draft → cập nhật trực tiếp, không tạo bản outdated
    if (material.status === LessonStatus.draft) {
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.type !== undefined) updateData.type = dto.type as MaterialType;

      // If updating to an image and file provided, upload
      if (this.isImageType(dto.type as string) && file) {
        const uploaded = await this.cloudinary.uploadFile(file, 'materials');
        updateData.url = uploaded.url;
      } else if (dto.url !== undefined) {
        updateData.url = dto.url;
      }

      const updated = await this.prisma.lessonMaterial.update({
        where: { id: materialId },
        data: updateData,
      });
      return { message: 'Cập nhật tài liệu thành công', data: updated };
    }

    // published → đánh dấu outdated, tạo bản nháp mới
    if (material.status === LessonStatus.published) {
      // Determine new URL: if updating to image and file provided, upload first
      let newUrl = dto.url ?? material.url;
      if (this.isImageType(dto.type as string) && file) {
        const uploaded = await this.cloudinary.uploadFile(file, 'materials');
        newUrl = uploaded.url;
      }

      const [, newMaterial] = await this.prisma.$transaction([
        this.prisma.lessonMaterial.update({
          where: { id: materialId },
          data: { status: LessonStatus.outdated },
        }),
        this.prisma.lessonMaterial.create({
          data: {
            name: dto.name ?? material.name,
            url: newUrl,
            type: (dto.type as MaterialType) ?? material.type,
            lessonId: material.lessonId,
            isPreview: material.isPreview,
            status: LessonStatus.draft,
          },
        }),
      ]);

      return {
        message: 'Cập nhật tài liệu thành công (tạo bản mới)',
        data: newMaterial,
      };
    }

    // outdated / deleted → không cho sửa
    throw new BadRequestException('Tài liệu đang ở trạng thái không thể chỉnh sửa');
  }

  // ── Delete Course ─────────────────────────────────────────────────────────

  async deleteCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    await this.prisma.$transaction([
      this.prisma.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.outdated,
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
      this.prisma.lesson.updateMany({
        where: { courseId, isDeleted: false },
        data: {
          status: LessonStatus.outdated,
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
      this.prisma.lessonMaterial.updateMany({
        where: { lesson: { courseId }, isDeleted: false },
        data: {
          status: LessonStatus.outdated,
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
      this.prisma.exam.updateMany({
        where: { courseId, isDeleted: false },
        data: {
          status: LessonStatus.outdated,
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Xóa khóa học thành công' };
  }

  // ── Delete Lesson ─────────────────────────────────────────────────────────

  async deleteLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, isDeleted: false },
      include: { course: { select: { userId: true, status: true } } },
    });
    if (!lesson) throw new NotFoundException('Bài học không tồn tại');
    if (lesson.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác bài học này');

    // Không cho phép xóa khi khóa học đang chờ duyệt hoặc đang chờ cập nhật
    if (lesson.course.status === CourseStatus.pending || lesson.course.status === CourseStatus.update) {
      throw new BadRequestException('Không thể xóa bài học khi khóa học đang chờ phê duyệt');
    }

    if (lesson.status === LessonStatus.draft) {
      // Draft lesson → xóa thật kèm toàn bộ tài liệu
      await this.prisma.$transaction([
        this.prisma.lessonMaterial.deleteMany({ where: { lessonId } }),
        this.prisma.lesson.delete({ where: { id: lessonId } }),
      ]);
    } else {
      // Published lesson → outdated, toàn bộ tài liệu → outdated
      await this.prisma.$transaction([
        this.prisma.lesson.update({
          where: { id: lessonId },
          data: { status: LessonStatus.outdated },
        }),
        this.prisma.lessonMaterial.updateMany({
          where: { lessonId, isDeleted: false, status: { not: LessonStatus.deleted } },
          data: { status: LessonStatus.outdated },
        }),
      ]);
    }

    return { message: 'Xóa bài học thành công' };
  }

  // ── Delete Lesson Material ────────────────────────────────────────────────

  async deleteLessonMaterial(userId: string, materialId: string) {
    const material = await this.prisma.lessonMaterial.findFirst({
      where: { id: materialId, isDeleted: false },
      include: {
        lesson: { include: { course: { select: { userId: true, status: true } } } },
      },
    });
    if (!material) throw new NotFoundException('Tài liệu không tồn tại');
    if (material.lesson.course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác tài liệu này');

    // Không cho phép xóa khi khóa học đang chờ duyệt hoặc đang chờ cập nhật
    if (material.lesson.course.status === CourseStatus.pending || material.lesson.course.status === CourseStatus.update) {
      throw new BadRequestException('Không thể xóa tài liệu khi khóa học đang chờ phê duyệt');
    }

    if (material.status === LessonStatus.draft) {
      // Draft → xóa thật
      await this.prisma.lessonMaterial.delete({ where: { id: materialId } });
    } else {
      // Published → outdated
      await this.prisma.lessonMaterial.update({
        where: { id: materialId },
        data: { status: LessonStatus.outdated },
      });
    }

    return { message: 'Xóa tài liệu thành công' };
  }

  // ── Submit for Review ─────────────────────────────────────────────────────

  async submitForReview(userId: string, courseId: string, description: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');
    if (course.userId !== userId)
      throw new ForbiddenException('Bạn không có quyền thao tác khóa học này');

    const isFirstPublish = course.publishedAt === null;

    if (isFirstPublish) {
      // Chưa từng published → pending
      const validStatuses: CourseStatus[] = [CourseStatus.draft, CourseStatus.rejected];
      if (!validStatuses.includes(course.status)) {
        throw new BadRequestException('Khóa học đang ở trạng thái không thể gửi xét duyệt');
      }

      await this.prisma.$transaction([
        this.prisma.course.update({
          where: { id: courseId },
          data: { status: CourseStatus.pending },
        }),
        this.prisma.courseApproval.create({
          data: { courseId, teacherId: userId, description },
        }),
      ]);

      return { message: 'Gửi xét duyệt khóa học thành công' };
    }

    // Đã từng published → update
    const validUpdateStatuses: CourseStatus[] = [CourseStatus.published, CourseStatus.need_update];
    if (!validUpdateStatuses.includes(course.status)) {
      throw new BadRequestException('Khóa học đang ở trạng thái không thể gửi xét duyệt');
    }

    // Kiểm tra có thay đổi (draft hoặc outdated items)
    const hasChanges = await this.hasUnpublishedChanges(courseId);
    if (!hasChanges) {
      throw new BadRequestException('Không có nội dung nào cần xét duyệt');
    }

    await this.prisma.$transaction([
      this.prisma.course.update({
        where: { id: courseId },
        data: { status: CourseStatus.update },
      }),
      this.prisma.courseApproval.create({
        data: { courseId, teacherId: userId, description },
      }),
    ]);

    return { message: 'Gửi xét duyệt cập nhật khóa học thành công' };
  }

  // ── Admin Publish Course ──────────────────────────────────────────────────

  async publishCourse(adminId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    if (
      course.status !== CourseStatus.pending &&
      course.status !== CourseStatus.update
    ) {
      throw new BadRequestException('Khóa học không ở trạng thái chờ duyệt');
    }

    const isFirstPublish = course.publishedAt === null;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Cập nhật trạng thái khóa học
      await tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.published,
          publishedBy: adminId,
          publishedAt: isFirstPublish ? now : course.publishedAt,
        },
      });

      // Lessons: draft → published
      await tx.lesson.updateMany({
        where: { courseId, status: LessonStatus.draft, isDeleted: false },
        data: { status: LessonStatus.published, publisherId: adminId, publishedAt: now },
      });

      // Lessons: outdated → deleted
      await tx.lesson.updateMany({
        where: { courseId, status: LessonStatus.outdated, isDeleted: false },
        data: { status: LessonStatus.deleted, isDeleted: true, deletedAt: now },
      });

      // Materials: draft → published
      await tx.lessonMaterial.updateMany({
        where: { lesson: { courseId }, status: LessonStatus.draft, isDeleted: false },
        data: { status: LessonStatus.published, publisherId: adminId, publishedAt: now },
      });

      // Materials: outdated → deleted
      await tx.lessonMaterial.updateMany({
        where: { lesson: { courseId }, status: LessonStatus.outdated, isDeleted: false },
        data: { status: LessonStatus.deleted, isDeleted: true, deletedAt: now },
      });

      // Exams: draft → published
      await tx.exam.updateMany({
        where: { courseId, status: LessonStatus.draft, isDeleted: false },
        data: { status: LessonStatus.published, publisherId: adminId, publishedAt: now },
      });

      // Exams: outdated → deleted
      await tx.exam.updateMany({
        where: { courseId, status: LessonStatus.outdated, isDeleted: false },
        data: { status: LessonStatus.deleted, isDeleted: true, deletedAt: now },
      });

      // Cập nhật trạng thái phê duyệt
      await tx.courseApproval.updateMany({
        where: { courseId, status: 'pending' },
        data: { status: 'approved', adminId },
      });

      // Tạo hội thoại khi published lần đầu tiên
      if (isFirstPublish) {
        const conversation = await tx.conversation.create({
          data: { courseId, name: course.name },
        });
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

  // ── Admin Reject Course ───────────────────────────────────────────────────

  async rejectCourse(adminId: string, courseId: string, reason: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    if (
      course.status !== CourseStatus.pending &&
      course.status !== CourseStatus.update
    ) {
      throw new BadRequestException('Khóa học không ở trạng thái chờ duyệt');
    }

    // pending → rejected, update → need_update
    const newStatus = course.status === CourseStatus.pending
      ? CourseStatus.rejected
      : CourseStatus.need_update;

    await this.prisma.$transaction([
      this.prisma.course.update({
        where: { id: courseId },
        data: { status: newStatus },
      }),
      this.prisma.courseApproval.updateMany({
        where: { courseId, status: 'pending' },
        data: { status: 'rejected', reason, adminId },
      }),
    ]);

    return { message: 'Từ chối khóa học thành công' };
  }

  // ── Helper: kiểm tra có thay đổi chưa duyệt ─────────────────────────────

  private async hasUnpublishedChanges(courseId: string): Promise<boolean> {
    const [draftLessons, outdatedLessons, draftMaterials, outdatedMaterials, draftExams, outdatedExams] = await Promise.all([
      this.prisma.lesson.count({ where: { courseId, status: LessonStatus.draft, isDeleted: false } }),
      this.prisma.lesson.count({ where: { courseId, status: LessonStatus.outdated, isDeleted: false } }),
      this.prisma.lessonMaterial.count({ where: { lesson: { courseId }, status: LessonStatus.draft, isDeleted: false } }),
      this.prisma.lessonMaterial.count({ where: { lesson: { courseId }, status: LessonStatus.outdated, isDeleted: false } }),
      this.prisma.exam.count({ where: { courseId, status: LessonStatus.draft, isDeleted: false } }),
      this.prisma.exam.count({ where: { courseId, status: LessonStatus.outdated, isDeleted: false } }),
    ]);
    return draftLessons + outdatedLessons + draftMaterials + outdatedMaterials + draftExams + outdatedExams > 0;
  }

  // ── Helper: kiểm tra học viên bị chặn bởi đề thi ──────────────────────────
  // Nếu có đề thi nào được tạo TRƯỚC lesson này mà học viên chưa pass → chặn
  async isBlockedByExam(
    courseId: string,
    lessonCreatedAt: Date,
    userId: string,
  ): Promise<boolean> {
    // Tìm tất cả exam published thuộc khóa học, có createdAt < lesson.createdAt
    const examsBefore = await this.prisma.exam.findMany({
      where: {
        courseId,
        isDeleted: false,
        status: { in: [LessonStatus.published] },
        createdAt: { lt: lessonCreatedAt },
      },
      select: { id: true },
    });

    if (examsBefore.length === 0) return false;

    // Kiểm tra mỗi exam xem user đã pass chưa
    for (const exam of examsBefore) {
      const passed = await this.prisma.examAttempt.findFirst({
        where: { examId: exam.id, userId, isPassed: true },
      });
      if (!passed) return true; // Có exam chưa pass → chặn
    }

    return false;
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

    if (
      roleName &&
      roleName !== ROLE_NAME.USER &&
      roleName !== ROLE_NAME.TEACHER
    ) {
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
