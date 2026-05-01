import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseStatus, LessonStatus } from '@prisma/client';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CloudinaryService } from '@/modules/cloudinary/cloudinary.service';
import { CourseService } from './course.service';

// ─── Stub providers ───────────────────────────────────────────────────────────

const mockPrisma = {
  course: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  lesson: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), count: jest.fn() },
  lessonMaterial: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
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

// ─── Factories ────────────────────────────────────────────────────────────────

const baseCourse = (overrides: Record<string, unknown> = {}) => ({
  id: 'course-1',
  name: 'NestJS Course',
  userId: 'user-1',
  status: CourseStatus.draft,
  isDeleted: false,
  ...overrides,
});

const baseLesson = (overrides: Record<string, unknown> = {}) => ({
  id: 'lesson-1',
  name: 'Lesson 1',
  courseId: 'course-1',
  status: LessonStatus.draft,
  isDeleted: false,
  createdAt: new Date('2026-01-01'),
  course: { userId: 'user-1', status: CourseStatus.draft },
  ...overrides,
});

const baseMaterial = (overrides: Record<string, unknown> = {}) => ({
  id: 'material-1',
  name: 'Video 1',
  url: 'https://cdn.example.com/video.mp4',
  type: 'video',
  lessonId: 'lesson-1',
  isPreview: false,
  status: LessonStatus.draft,
  isDeleted: false,
  lesson: {
    course: { userId: 'user-1', status: CourseStatus.published },
  },
  ...overrides,
});

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('CourseService – Lesson & Material', () => {
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

  // ── createLesson() ────────────────────────────────────────────────────────

  describe('createLesson()', () => {
    it('UN_LES_01 – Course không tồn tại', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);

      await expect(service.createLesson('user-1', 'invalid', { name: 'Lesson 1' } as any))
        .rejects.toThrow(new NotFoundException('Khóa học không tồn tại'));

      expect(mockPrisma.lesson.create).not.toHaveBeenCalled();
    });

    it('UN_LES_02 – Tạo bài học thành công', async () => {
      const lesson = baseLesson();
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse());
      mockPrisma.lesson.create.mockResolvedValue(lesson);

      const res = await service.createLesson('user-1', 'course-1', { name: 'Lesson 1' } as any);

      expect(res.message).toBe('Tạo bài học thành công');
      expect(res.data.status).toBe(LessonStatus.draft);
      expect(mockPrisma.lesson.create).toHaveBeenCalledWith({
        data: { name: 'Lesson 1', courseId: 'course-1', status: LessonStatus.draft },
      });
    });
  });

  // ── deleteLesson() ────────────────────────────────────────────────────────

  describe('deleteLesson()', () => {
    it('UN_LES_03 – Lesson draft → hard delete (xóa thật lesson + materials)', async () => {
      mockPrisma.lesson.findFirst.mockResolvedValue(baseLesson({ status: LessonStatus.draft }));
      mockPrisma.$transaction.mockResolvedValue([]);

      const res = await service.deleteLesson('user-1', 'lesson-1');

      expect(res.message).toBe('Xóa bài học thành công');
      // $transaction phải được gọi với mảng chứa deleteMany materials và delete lesson
      const txArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(txArgs)).toBe(true);
      // Xác nhận deleteMany materials được gọi trước delete lesson
      expect(mockPrisma.lessonMaterial.deleteMany).toHaveBeenCalledWith({
        where: { lessonId: 'lesson-1' },
      });
      expect(mockPrisma.lesson.delete).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
      });
    });

    it('UN_LES_04 – Lesson published → soft delete (status=outdated)', async () => {
      mockPrisma.lesson.findFirst.mockResolvedValue(
        baseLesson({ status: LessonStatus.published }),
      );
      mockPrisma.$transaction.mockResolvedValue([]);

      const res = await service.deleteLesson('user-1', 'lesson-1');

      expect(res.message).toBe('Xóa bài học thành công');
      // lesson.update gọi với status=outdated
      expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
        data: { status: LessonStatus.outdated },
      });
      // materials.updateMany gọi với status=outdated
      expect(mockPrisma.lessonMaterial.updateMany).toHaveBeenCalledWith({
        where: { lessonId: 'lesson-1', isDeleted: false, status: { not: LessonStatus.deleted } },
        data: { status: LessonStatus.outdated },
      });
    });

    it('UN_LES_05 – Hard delete lesson draft kèm materials (transaction chứa đủ 2 thao tác)', async () => {
      mockPrisma.lesson.findFirst.mockResolvedValue(baseLesson({ status: LessonStatus.draft }));
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.deleteLesson('user-1', 'lesson-1');

      // Xác nhận $transaction được gọi với cả deleteMany materials lẫn delete lesson
      expect(mockPrisma.lessonMaterial.deleteMany).toHaveBeenCalledWith({
        where: { lessonId: 'lesson-1' },
      });
      expect(mockPrisma.lesson.delete).toHaveBeenCalledWith({
        where: { id: 'lesson-1' },
      });
      // Cả hai lệnh phải nằm trong cùng một $transaction (gọi đúng 1 lần)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── updateLessonMaterial() ────────────────────────────────────────────────

  describe('updateLessonMaterial()', () => {
    it('UN_LES_06 – Course đang pending → throw BadRequestException', async () => {
      mockPrisma.lessonMaterial.findFirst.mockResolvedValue(
        baseMaterial({ lesson: { course: { userId: 'user-1', status: CourseStatus.pending } } }),
      );

      await expect(service.updateLessonMaterial('user-1', 'material-1', {} as any))
        .rejects.toThrow(
          new BadRequestException('Không thể chỉnh sửa tài liệu khi khóa học đang chờ phê duyệt'),
        );

      expect(mockPrisma.lessonMaterial.update).not.toHaveBeenCalled();
    });

    it('UN_LES_07 – Material published → bản cũ=outdated, tạo bản nháp mới', async () => {
      const oldMaterial = baseMaterial({ status: LessonStatus.published });
      const newDraftMaterial = { ...baseMaterial(), id: 'material-2', status: LessonStatus.draft };

      mockPrisma.lessonMaterial.findFirst.mockResolvedValue(oldMaterial);
      // $transaction trả về [updated, created]
      mockPrisma.$transaction.mockResolvedValue([
        { ...oldMaterial, status: LessonStatus.outdated },
        newDraftMaterial,
      ]);

      const res = await service.updateLessonMaterial('user-1', 'material-1', { name: 'Updated Video' } as any);

      expect(res.message).toBe('Cập nhật tài liệu thành công (tạo bản mới)');
      // $transaction phải được gọi với 2 thao tác: update cũ → outdated + create mới
      expect(mockPrisma.lessonMaterial.update).toHaveBeenCalledWith({
        where: { id: 'material-1' },
        data: { status: LessonStatus.outdated },
      });
      expect(mockPrisma.lessonMaterial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: LessonStatus.draft, lessonId: 'lesson-1' }),
        }),
      );
    });

    it('UN_LES_08 – Course status=update cũng không cho chỉnh sửa material', async () => {
      mockPrisma.lessonMaterial.findFirst.mockResolvedValue(
        baseMaterial({ lesson: { course: { userId: 'user-1', status: CourseStatus.update } } }),
      );

      await expect(service.updateLessonMaterial('user-1', 'material-1', {} as any))
        .rejects.toThrow(
          new BadRequestException('Không thể chỉnh sửa tài liệu khi khóa học đang chờ phê duyệt'),
        );

      expect(mockPrisma.lessonMaterial.update).not.toHaveBeenCalled();
    });
  });
});
