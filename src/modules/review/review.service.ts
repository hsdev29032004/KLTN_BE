import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const REVIEWER_SELECT = {
  id: true,
  fullName: true,
  avatar: true,
};

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) { }

  async create(userId: string, dto: CreateReviewDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, isDeleted: false, status: 'published' },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    // Kiểm tra đã mua khóa học chưa
    const purchased = await this.prisma.coursePurchase.findFirst({
      where: { userId, courseId: dto.courseId, isDeleted: false },
    });
    if (!purchased)
      throw new ForbiddenException('Bạn phải mua khóa học trước khi đánh giá');

    // Mỗi user chỉ review 1 lần
    const existing = await this.prisma.courseReview.findFirst({
      where: { reviewerId: userId, courseId: dto.courseId, isDeleted: false },
    });
    if (existing)
      throw new BadRequestException('Bạn đã đánh giá khóa học này rồi');

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.courseReview.create({
        data: {
          reviewerId: userId,
          courseId: dto.courseId,
          rating: dto.rating,
          content: dto.content,
        },
        select: {
          id: true,
          rating: true,
          content: true,
          createdAt: true,
          reviewer: { select: REVIEWER_SELECT },
        },
      });

      // Cập nhật lại điểm star trung bình của khóa học
      const agg = await tx.courseReview.aggregate({
        where: { courseId: dto.courseId, isDeleted: false },
        _avg: { rating: true },
      });

      await tx.course.update({
        where: { id: dto.courseId },
        data: { star: agg._avg.rating ?? 0 },
      });

      return created;
    });

    return { message: 'Đánh giá thành công', data: review };
  }

  async findByCourseId(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    const reviews = await this.prisma.courseReview.findMany({
      where: { courseId, isDeleted: false },
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        reviewer: { select: REVIEWER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { message: 'Lấy danh sách đánh giá thành công', data: reviews };
  }

  async findOne(id: string) {
    const review = await this.prisma.courseReview.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        courseId: true,
        reviewer: { select: REVIEWER_SELECT },
      },
    });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    return { message: 'Lấy đánh giá thành công', data: review };
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.courseReview.findFirst({
      where: { id, isDeleted: false },
    });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    if (review.reviewerId !== userId)
      throw new ForbiddenException('Bạn không có quyền sửa đánh giá này');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.courseReview.update({
        where: { id },
        data: {
          ...(dto.rating !== undefined && { rating: dto.rating }),
          ...(dto.content !== undefined && { content: dto.content }),
        },
        select: {
          id: true,
          rating: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          reviewer: { select: REVIEWER_SELECT },
        },
      });

      // Cập nhật lại star trung bình
      const agg = await tx.courseReview.aggregate({
        where: { courseId: review.courseId, isDeleted: false },
        _avg: { rating: true },
      });
      await tx.course.update({
        where: { id: review.courseId },
        data: { star: agg._avg.rating ?? 0 },
      });

      return result;
    });

    return { message: 'Cập nhật đánh giá thành công', data: updated };
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.courseReview.findFirst({
      where: { id, isDeleted: false },
    });
    if (!review) throw new NotFoundException('Đánh giá không tồn tại');
    if (review.reviewerId !== userId)
      throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');

    await this.prisma.$transaction(async (tx) => {
      await tx.courseReview.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // Cập nhật lại star trung bình
      const agg = await tx.courseReview.aggregate({
        where: { courseId: review.courseId, isDeleted: false },
        _avg: { rating: true },
      });
      await tx.course.update({
        where: { id: review.courseId },
        data: { star: agg._avg.rating ?? 0 },
      });
    });

    return { message: 'Xóa đánh giá thành công' };
  }
}
