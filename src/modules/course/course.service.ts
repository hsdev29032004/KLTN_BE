import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';

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

  async findByUserId(userId: string) {
    const courses = await this.prisma.course.findMany({
      where: { userId, isDeleted: false },
      select: COURSE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return { message: 'Lấy danh sách khóa học theo user thành công', data: courses };
  }

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, isDeleted: false },
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
          where: { isDeleted: false, status: 'published' },
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            materials: {
              where: { isDeleted: false, status: 'published' },
              select: {
                id: true,
                name: true,
                type: true,
                url: true,
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

    if (!course) throw new NotFoundException('Khóa học không tồn tại');

    return { message: 'Lấy thông tin khóa học thành công', data: course };
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

    return { message: 'Lấy danh sách khóa học đã mua thành công', data: courses };
  }
}
