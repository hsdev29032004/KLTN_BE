import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';

@Injectable()
export class ConservationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách nhóm chat của giảng viên
   * Query các khóa học của giảng viên => từ các khóa học đó query đến conversation của khóa học
   */
  async getInstructorConversations(instructorId: string) {
    // Kiểm tra giảng viên có tồn tại hay không
    const instructor = await this.prisma.user.findUnique({
      where: { id: instructorId },
      select: { id: true, fullName: true, email: true },
    });

    if (!instructor) {
      throw new NotFoundException('Giảng viên không tồn tại');
    }

    // Lấy tất cả khóa học của giảng viên
    const instructorCourses = await this.prisma.course.findMany({
      where: { userId: instructorId, isDeleted: false },
      select: { id: true, name: true, slug: true, thumbnail: true },
    });

    if (instructorCourses.length === 0) {
      return {
        message: 'Giảng viên chưa có khóa học nào',
        data: [],
      };
    }

    // Lấy danh sách ID khóa học
    const courseIds = instructorCourses.map((course) => course.id);

    // Lấy tất cả conversation liên quan đến các khóa học của giảng viên
    const conversations = await this.prisma.conversation.findMany({
      where: {
        courseId: { in: courseIds },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        courseId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Lấy danh sách nhóm chat của giảng viên thành công',
      data: conversations,
    };
  }

  /**
   * Lấy chi tiết conversation kèm danh sách message
   */
  async getConversationDetails(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, isDeleted: false },
      select: {
        id: true,
        name: true,
        courseId: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            sender: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    return {
      message: 'Lấy chi tiết conversation thành công',
      data: conversation,
    };
  }

  /**
   * Lấy danh sách conversation theo courseId
   */
  async getConversationByCourseId(courseId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { courseId },
      select: {
        id: true,
        name: true,
        courseId: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    return {
      message: 'Lấy conversation theo khóa học thành công',
      data: conversation,
    };
  }

  /**
   * Lấy tất cả conversation mà người dùng đang có
   * Query các khóa học mà user đã mua => từ các khóa học đó query đến conversation
   */
  async getConversationsByUserId(userId: string) {
    // Kiểm tra user có tồn tại hay không
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Lấy tất cả khóa học mà user đã mua (qua UserCourse)
    const userCourses = await this.prisma.userCourse.findMany({
      where: { userId, course: { isDeleted: false } },
      select: { courseId: true },
    });

    if (userCourses.length === 0) {
      return {
        message: 'Người dùng chưa mua khóa học nào',
        data: [],
      };
    }

    // Lấy danh sách courseId
    const courseIds = userCourses.map((uc) => uc.courseId);

    // Lấy tất cả conversation từ các khóa học mà user đã mua
    const conversations = await this.prisma.conversation.findMany({
      where: {
        courseId: { in: courseIds },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        courseId: true,
        createdAt: true,
        updatedAt: true,
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Lấy danh sách conversation của người dùng thành công',
      data: conversations,
    };
  }
}
