import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';

@Injectable()
export class ConservationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách conversation của user qua bảng ConversationMember
   */
  async getMyConversations(userId: string) {
    const conversations = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: {
        isHost: true,
        conversation: {
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
                  select: { id: true, fullName: true, avatar: true },
                },
              },
            },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                createdAt: true,
                sender: {
                  select: { id: true, fullName: true, avatar: true },
                },
              },
            },
            _count: {
              select: { messages: { where: { isDeleted: false } }, members: true },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    const data = conversations.map((m) => ({
      ...m.conversation,
      isHost: m.isHost,
      lastMessage: m.conversation.messages[0] || null,
      messages: undefined,
    }));

    return { message: 'Lấy danh sách hội thoại thành công', data };
  }

  /**
   * Lấy chi tiết conversation kèm messages (phân trang)
   */
  async getConversationDetail(userId: string, conversationId: string, query: Record<string, string>) {
    // Kiểm tra user có phải member không
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không phải thành viên của hội thoại này');
    }

    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 50));

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, isDeleted: false },
      select: {
        id: true,
        name: true,
        courseId: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            user: {
              select: { id: true, fullName: true, avatar: true },
            },
          },
        },
        members: {
          select: {
            userId: true,
            isHost: true,
            user: {
              select: { id: true, fullName: true, avatar: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Hội thoại không tồn tại');
    }

    const [messages, totalMessages] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          content: true,
          createdAt: true,
          sender: {
            select: { id: true, fullName: true, avatar: true },
          },
        },
      }),
      this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
    ]);

    return {
      message: 'Lấy chi tiết hội thoại thành công',
      data: {
        ...conversation,
        messages: messages.reverse(),
      },
      meta: {
        total: totalMessages,
        page,
        limit,
        totalPages: Math.ceil(totalMessages / limit),
      },
    };
  }

  /**
   * Gửi tin nhắn mới
   */
  async sendMessage(userId: string, conversationId: string, content: string) {
    // Kiểm tra member
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không phải thành viên của hội thoại này');
    }

    const msg = await this.prisma.message.create({
      data: { conversationId, senderId: userId, content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        conversationId: true,
        sender: {
          select: { id: true, fullName: true, avatar: true },
        },
      },
    });

    // Cập nhật updatedAt cho conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { message: 'Gửi tin nhắn thành công', data: msg };
  }
}
