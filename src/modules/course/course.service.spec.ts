import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CloudinaryService } from '@/modules/cloudinary/cloudinary.service';
import { CourseService } from './course.service';

// ─── Stub providers ───────────────────────────────────────────────────────────

const mockPrisma = {
  course: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  lesson: { count: jest.fn(), updateMany: jest.fn() },
  lessonMaterial: { count: jest.fn(), updateMany: jest.fn() },
  exam: { findMany: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
  examQuestion: { count: jest.fn() },
  courseApproval: { create: jest.fn(), updateMany: jest.fn() },
  userCourse: { findMany: jest.fn(), findFirst: jest.fn() },
  conversation: { create: jest.fn() },
  conversationMember: { create: jest.fn() },
  invoices: { create: jest.fn(), update: jest.fn() },
  detailInvoices: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockCloudinary = { uploadFile: jest.fn() };

// ─── Factory ──────────────────────────────────────────────────────────────────

const baseCourse = (overrides: Record<string, unknown> = {}) => ({
  id: 'course-1',
  name: 'NestJS Course',
  slug: 'nestjs-course',
  price: 299000,
  commissionRate: 10,
  thumbnail: 'thumb.png',
  content: 'content',
  description: 'desc',
  status: CourseStatus.draft,
  star: 0,
  studentCount: 0,
  userId: 'user-1',
  publishedAt: null,
  publishedBy: null,
  isDeleted: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: mockCloudinary },
      ],
    }).compile();

    service = module.get(CourseService);
    jest.clearAllMocks();
  });

  // ── createCourse() ────────────────────────────────────────────────────────

  describe('createCourse()', () => {
    const dto = { name: 'NestJS', price: 299000, thumbnail: 'thumb.png', content: 'c', description: 'd', commissionRate: 10 };

    it('UN_CRS_01 – Tạo khóa học thành công', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.course.create.mockResolvedValue(baseCourse({ name: 'NestJS', slug: 'nestjs', status: CourseStatus.draft }));

      const res = await service.createCourse('user-1', dto as any);

      expect(res.message).toBe('Tạo khóa học thành công');
      expect(res.data.status).toBe(CourseStatus.draft);
      expect(mockPrisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'NestJS', status: CourseStatus.draft, userId: 'user-1' }),
        }),
      );
    });

    it('UN_CRS_02 – slug bị trùng nhau', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      mockPrisma.course.findUnique.mockResolvedValue(baseCourse()); // slug đã tồn tại
      mockPrisma.course.create.mockResolvedValue(baseCourse({ slug: 'nestjs-1700000000000' }));

      await service.createCourse('user-1', dto as any);

      const slug = mockPrisma.course.create.mock.calls[0][0].data.slug;
      expect(slug).toBe('nestjs-1700000000000');
      nowSpy.mockRestore();
    });
  });

  // ── updateCourse() ────────────────────────────────────────────────────────

  describe('updateCourse()', () => {
    it('UN_CRS_03 – Course không tồn tại', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);

      await expect(service.updateCourse('user-1', 'invalid', {} as any))
        .rejects.toThrow(new NotFoundException('Khóa học không tồn tại'));
    });

    it('UN_CRS_04 – Không phải chủ sở hữu', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse({ userId: 'other-user' }));

      await expect(service.updateCourse('user-1', 'course-1', {} as any))
        .rejects.toThrow(new ForbiddenException('Bạn không có quyền thao tác khóa học này'));
    });

    it('UN_CRS_05 – Cập nhật thành công', async () => {
      const updated = baseCourse({ name: 'New Name' });
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse());
      mockPrisma.course.update.mockResolvedValue(updated);

      const res = await service.updateCourse('user-1', 'course-1', { name: 'New Name' } as any);

      expect(res.message).toBe('Cập nhật khóa học thành công');
      expect(res.data).toEqual(updated);
      expect(mockPrisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'course-1' } }),
      );
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('UN_CRS_06 – Lấy danh sách public', async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);

      const res = await service.findAll();

      expect(res.message).toBe('Lấy danh sách khóa học thành công');
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isDeleted: false,
            status: { in: [CourseStatus.published, CourseStatus.update, CourseStatus.need_update] },
          },
        }),
      );
    });
  });

  // ── searchCourses() ───────────────────────────────────────────────────────

  describe('searchCourses()', () => {
    beforeEach(() => {
      mockPrisma.course.findMany.mockResolvedValue([]);
      mockPrisma.course.count.mockResolvedValue(0);
    });

    it('UN_CRS_07 – Tìm theo tên', async () => {
      await service.searchCourses({ name: 'nestjs' } as any);

      const where = mockPrisma.course.findMany.mock.calls[0][0].where;
      expect(where.name).toEqual({ contains: 'nestjs', mode: 'insensitive' });
    });

    it('UN_CRS_08 – Lọc theo giá', async () => {
      await service.searchCourses({ minPrice: 100, maxPrice: 500 } as any);

      const where = mockPrisma.course.findMany.mock.calls[0][0].where;
      expect(where.price).toEqual({ gte: 100, lte: 500 });
    });

    it('UN_CRS_09 – Pagination mặc định', async () => {
      const res = await service.searchCourses({} as any);

      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(20);
    });
  });

  // ── findBySlugOrId() ──────────────────────────────────────────────────────

  describe('findBySlugOrId()', () => {
    it('UN_CRS_10 – Course không tồn tại', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);

      await expect(service.findBySlugOrId('invalid', null as any))
        .rejects.toThrow(new NotFoundException('Khóa học không tồn tại'));
    });

    it('UN_CRS_11 – Owner truy cập', async () => {
      const user = { id: 'user-1', role: { name: 'Teacher' } };
      mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1', userId: 'user-1' });
      mockPrisma.course.findUnique.mockResolvedValue({
        ...baseCourse(),
        user: {}, publisher: null, courseTopics: [], lessons: [],
        reviews: [], exams: [], _count: { reviews: 0, userCourses: 0 }, approvals: [],
      });

      const res = await service.findBySlugOrId('course-1', user as any);

      expect(res.canAccess).toBe(true);
    });
  });

  // ── submitForReview() ─────────────────────────────────────────────────────

  describe('submitForReview()', () => {
    it('UN_CRS_12 – Gửi lần đầu thành công', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(
        baseCourse({ status: CourseStatus.draft, publishedAt: null }),
      );
      mockPrisma.lesson.count.mockResolvedValue(1);  // có bài học
      mockPrisma.exam.findMany.mockResolvedValue([]); // không có draft exam
      mockPrisma.$transaction.mockResolvedValue([]);

      const res = await service.submitForReview('user-1', 'course-1', 'Mô tả');

      expect(res.message).toBe('Gửi xét duyệt khóa học thành công');
    });

    it('UN_CRS_13 – Không có thay đổi mới để duyệt', async () => {
      // course đã published, publishedAt != null → vào update flow
      mockPrisma.course.findFirst.mockResolvedValue(
        baseCourse({ status: CourseStatus.published, publishedAt: new Date('2026-01-01') }),
      );
      // hasUnpublishedChanges: tất cả count = 0
      mockPrisma.lesson.count.mockResolvedValue(0);
      mockPrisma.lessonMaterial.count.mockResolvedValue(0);
      mockPrisma.exam.count.mockResolvedValue(0);

      await expect(service.submitForReview('user-1', 'course-1', 'Mô tả'))
        .rejects.toThrow(new BadRequestException('Không có nội dung nào cần xét duyệt'));
    });

    it('UN_CRS_14 – Khóa học chưa có bài học nào', async () => {
      // course.status='draft', publishedAt=null (first publish flow), lessons=[]
      mockPrisma.course.findFirst.mockResolvedValue(
        baseCourse({ status: CourseStatus.draft, publishedAt: null }),
      );
      mockPrisma.lesson.count.mockResolvedValue(0); // không có bài học

      await expect(service.submitForReview('user-1', 'course-1', 'Mô tả'))
        .rejects.toThrow(new BadRequestException('Khóa học đang ở trạng thái không thể gửi xét duyệt'));
    });
  });

  // ── publishCourse() ───────────────────────────────────────────────────────

  describe('publishCourse()', () => {
    it('UN_CRS_15 – Course không pending/update', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse({ status: CourseStatus.draft }));

      await expect(service.publishCourse('admin-1', 'course-1'))
        .rejects.toThrow(new BadRequestException('Khóa học không ở trạng thái chờ duyệt'));
    });

    it('UN_CRS_16 – Duyệt thành công', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(
        baseCourse({ status: CourseStatus.pending, publishedAt: null }),
      );
      mockPrisma.$transaction.mockImplementation((fn: any) =>
        typeof fn === 'function' ? fn(mockPrisma) : Promise.resolve(fn),
      );
      mockPrisma.course.update.mockResolvedValue({});
      mockPrisma.lesson.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.lessonMaterial.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.exam.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.courseApproval.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversationMember.create.mockResolvedValue({});

      const res = await service.publishCourse('admin-1', 'course-1');

      expect(res.message).toBe('Duyệt khóa học thành công');
      expect(mockPrisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: CourseStatus.published }) }),
      );
    });
  });

  // ── rejectCourse() ────────────────────────────────────────────────────────

  describe('rejectCourse()', () => {
    it('UN_CRS_17 – pending → rejected', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse({ status: CourseStatus.pending }));
      mockPrisma.course.update.mockResolvedValue({});
      mockPrisma.courseApproval.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.$transaction.mockResolvedValue([]);

      const res = await service.rejectCourse('admin-1', 'course-1', 'Ly do');

      expect(res.message).toBe('Từ chối khóa học thành công');
      expect(mockPrisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: CourseStatus.rejected } }),
      );
    });

    it('UN_CRS_18 – update → need_update', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse({ status: CourseStatus.update }));
      mockPrisma.course.update.mockResolvedValue({});
      mockPrisma.courseApproval.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.$transaction.mockResolvedValue([]);

      const res = await service.rejectCourse('admin-1', 'course-1', 'Can cap nhat');

      expect(res.message).toBe('Từ chối khóa học thành công');
      expect(mockPrisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: CourseStatus.need_update } }),
      );
    });
  });

  // ── purchaseCourses() ─────────────────────────────────────────────────────

  describe('purchaseCourses()', () => {
    it('UN_CRS_19 – courseIds rỗng', async () => {
      await expect(service.purchaseCourses('user-1', [], '127.0.0.1'))
        .rejects.toThrow(new BadRequestException('Danh sách khóa học rỗng'));
      expect(mockPrisma.userCourse.findMany).not.toHaveBeenCalled();
    });

    it('UN_CRS_20 – Mua khóa học của chính mình', async () => {
      // chưa mua bao giờ (không phát hiện duplicate)
      mockPrisma.userCourse.findMany.mockResolvedValue([]);
      // course do chính userId='user-1' sở hữu
      mockPrisma.course.findMany.mockResolvedValue([
        { id: 'course-1', price: 299000, userId: 'user-1', commissionRate: 10 },
      ]);

      await expect(service.purchaseCourses('user-1', ['course-1'], '127.0.0.1'))
        .rejects.toThrow(new BadRequestException('Không thể mua khóa học của chính mình'));
    });
  });
});
