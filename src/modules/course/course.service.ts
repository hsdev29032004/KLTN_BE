import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import * as jsonwebtoken from 'jsonwebtoken';
import type { IUser } from '@/shared/types/user.type';

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
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async findAll() {
    const courses = await this.prisma.course.findMany({
      where: { isDeleted: false, status: 'published' },
      select: COURSE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return { message: 'Lấy danh sách khóa học thành công', data: courses };
  }

  async findByIds(ids: string[]) {
    const courses = await this.prisma.course.findMany({
      where: { id: { in: ids }, isDeleted: false, status: 'published' },
      select: COURSE_LIST_SELECT,
    });

    return { message: 'Lấy danh sách khóa học theo danh sách ID thành công', data: courses };
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



  async getMaterial(materialId: string, user?: IUser) {
    // Lấy material và thông tin course/userCourses (không filter theo user ở query)
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

    // Nếu loại tài liệu không phải video => trả về url trực tiếp (không cần mã hóa)
    if (lessonMaterial.type !== 'video') {
      return { message: 'Lấy đường dẫn tài liệu thành công', data: { url: lessonMaterial.url } };
    }

    // Nếu là preview cho phép playback mà không cần mua
    if (lessonMaterial.isPreview) {
      return this.buildPlaybackResponse(lessonMaterial, user?.id);
    }

    // Nếu không phải preview, cần có user và kiểm tra quyền
    if (!user) {
      throw new NotFoundException('Tài liệu không tồn tại hoặc bạn chưa mua khóa học này');
    }

    // Nếu user là chủ khóa học (instructor) => cho phép
    const courseOwnerId = lessonMaterial.lesson?.course?.userId;
    if (user.id === courseOwnerId) {
      return this.buildPlaybackResponse(lessonMaterial, user?.id);
    }

    // Nếu role không phải 'user' hoặc 'teacher' => cho phép (ví dụ admin)
    const roleName = user.role?.name;
    if (roleName && roleName !== 'user' && roleName !== 'teacher') {
      return this.buildPlaybackResponse(lessonMaterial, user?.id);
    }

    // Cuối cùng kiểm tra đã mua chưa
    const purchased = !!lessonMaterial.lesson?.course?.userCourses?.some((uc) => uc.userId === user.id);
    if (!purchased) {
      throw new NotFoundException('Tài liệu không tồn tại hoặc bạn chưa mua khóa học này');
    }

    return this.buildPlaybackResponse(lessonMaterial, user?.id);
  }

  private buildPlaybackResponse(lessonMaterial: any, userId?: string) {
    // Nếu không phải video thì trả về url trực tiếp
    if (lessonMaterial.type !== 'video') {
      return { message: 'Lấy đường dẫn tài liệu thành công', data: { url: lessonMaterial.url } };
    }

    const playbackToken = { path: `lesson-${lessonMaterial.url}`, userId };
    const token = jsonwebtoken.sign(playbackToken, process.env.VIDEO_TOKEN_SECRET_KEY || '');
    return { message: 'Lấy token phát lại thành công', data: { token, url: lessonMaterial.url } };
  }
}
