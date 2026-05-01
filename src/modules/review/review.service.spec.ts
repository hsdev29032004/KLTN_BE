import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ReviewService } from './review.service';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

describe('ReviewService', () => {
  let service: ReviewService;
  let mockPrisma: any;

  const userId = 'user-1';
  const courseId = 'course-1';
  const reviewId = 'review-1';

  const baseCourse = () => ({ id: courseId, isDeleted: false, status: 'published', star: 4 });
  const baseUserCourse = () => ({ userId, courseId });
  const baseReview = () => ({
    id: reviewId,
    reviewerId: userId,
    courseId,
    rating: 5,
    content: 'Hay',
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewer: { id: userId, fullName: 'Test User', avatar: null },
  });

  beforeEach(async () => {
    const txMock = {
      courseReview: {
        create: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 } }),
        update: jest.fn(),
      },
      course: { update: jest.fn() },
    };

    mockPrisma = {
      course: { findFirst: jest.fn(), update: jest.fn() },
      userCourse: { findFirst: jest.fn() },
      courseReview: { findFirst: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(txMock) : Promise.resolve(cb))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  // ────────────────────────────── create() ──────────────────────────────

  describe('create()', () => {
    const dto = { courseId, rating: 5, content: 'Hay' };

    it('UN_REV_1 – Course không tồn tại → NotFoundException', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, { courseId: 'invalid', rating: 5, content: '...' }))
        .rejects.toThrow(new NotFoundException('Khóa học không tồn tại'));
    });

    it('UN_REV_2 – Chưa mua khóa học → ForbiddenException', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse());
      mockPrisma.userCourse.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, dto))
        .rejects.toThrow(new ForbiddenException('Bạn phải mua khóa học trước khi đánh giá'));
    });

    it('UN_REV_3 – Đã đánh giá rồi → BadRequestException', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse());
      mockPrisma.userCourse.findFirst.mockResolvedValue(baseUserCourse());
      mockPrisma.courseReview.findFirst.mockResolvedValue(baseReview());

      await expect(service.create(userId, dto))
        .rejects.toThrow(new BadRequestException('Bạn đã đánh giá khóa học này rồi'));
    });

    it('UN_REV_4 – Đánh giá thành công → tạo review, cập nhật course.star', async () => {
      const createdReview = { ...baseReview() };
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse());
      mockPrisma.userCourse.findFirst.mockResolvedValue(baseUserCourse());
      mockPrisma.courseReview.findFirst.mockResolvedValue(null);

      // Cần override $transaction để trả về createdReview
      const txMock = {
        courseReview: {
          create: jest.fn().mockResolvedValue(createdReview),
          aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 } }),
        },
        course: { update: jest.fn() },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) =>
        typeof cb === 'function' ? cb(txMock) : Promise.resolve(cb),
      );

      const result = await service.create(userId, dto);

      expect(result.message).toBe('Đánh giá thành công');
      expect(result.data).toEqual(createdReview);
      expect(txMock.courseReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reviewerId: userId, courseId, rating: 5, content: 'Hay' }),
        }),
      );
      expect(txMock.course.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { star: 5 } }),
      );
    });

    it('UN_REV_5 – rating = 0 (ngoài range 1–5) → ValidationError từ DTO', async () => {
      const dto5 = plainToInstance(CreateReviewDto, { courseId, rating: 0, content: '...' });
      const errors = await validate(dto5);

      const ratingErrors = errors.find((e) => e.property === 'rating');
      expect(ratingErrors).toBeDefined();
      expect(Object.keys(ratingErrors!.constraints ?? {})).toContain('min');
    });

    it('UN_REV_6 – Review cũ đã soft-delete → cho phép tạo review mới', async () => {
      const newReview = { ...baseReview(), id: 'review-2' };
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse());
      mockPrisma.userCourse.findFirst.mockResolvedValue(baseUserCourse());
      // findFirst với isDeleted:false → null (review cũ đã bị soft-delete)
      mockPrisma.courseReview.findFirst.mockResolvedValue(null);

      const txMock = {
        courseReview: {
          create: jest.fn().mockResolvedValue(newReview),
          aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 } }),
        },
        course: { update: jest.fn() },
      };
      mockPrisma.$transaction.mockImplementation((cb: any) =>
        typeof cb === 'function' ? cb(txMock) : Promise.resolve(cb),
      );

      const result = await service.create(userId, dto);

      expect(result.message).toBe('Đánh giá thành công');
      expect(result.data.id).toBe('review-2');
      expect(txMock.courseReview.create).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────── findByCourseId() ──────────────────────────────

  describe('findByCourseId()', () => {
    it('UN_REV_7 – Course không tồn tại → NotFoundException', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);

      await expect(service.findByCourseId('invalid'))
        .rejects.toThrow(new NotFoundException('Khóa học không tồn tại'));
    });

    it('UN_REV_8 – Lấy reviews thành công → trả về danh sách sắp xếp desc', async () => {
      const reviews = [
        { ...baseReview(), createdAt: new Date('2025-02-01') },
        { ...baseReview(), id: 'review-2', createdAt: new Date('2025-01-01') },
      ];
      mockPrisma.course.findFirst.mockResolvedValue(baseCourse());
      mockPrisma.courseReview.findMany.mockResolvedValue(reviews);

      const result = await service.findByCourseId(courseId);

      expect(result.message).toBe('Lấy danh sách đánh giá thành công');
      expect(result.data).toEqual(reviews);
      expect(mockPrisma.courseReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  // ────────────────────────────── findOne() ──────────────────────────────

  describe('findOne()', () => {
    it('UN_REV_9 – Review không tồn tại → NotFoundException', async () => {
      mockPrisma.courseReview.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid'))
        .rejects.toThrow(new NotFoundException('Đánh giá không tồn tại'));
    });
  });
});
