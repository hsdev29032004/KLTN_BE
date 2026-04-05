import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@/infras/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: process.env.FE_DOMAIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map socket.id -> userId
  private connectedUsers = new Map<string, string>();
  // Map socket.id -> auth promise (chờ xác thực xong)
  private authPromises = new Map<string, Promise<string | null>>();

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Helper: lấy userId, chờ auth hoàn thành nếu đang pending
   */
  private async getUserId(client: Socket): Promise<string | null> {
    const promise = this.authPromises.get(client.id);
    if (promise) {
      return promise;
    }
    return this.connectedUsers.get(client.id) || null;
  }

  async handleConnection(client: Socket) {
    const authPromise = this.authenticate(client);
    this.authPromises.set(client.id, authPromise);
    await authPromise;
  }

  private async authenticate(client: Socket): Promise<string | null> {
    try {
      const cookieHeader = client.handshake.headers?.cookie || '';

      const token =
        client.handshake.auth?.token ||
        cookieHeader
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('access_token='))
          ?.substring('access_token='.length);

      if (!token) {
        client.emit('error', { message: 'Unauthorized' });
        client.disconnect();
        return null;
      }

      const payload: any = jwt.verify(
        token,
        process.env.ACCESSTOKEN_SECRET_KEY as string,
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id, isDeleted: false },
        select: { id: true, fullName: true, avatar: true },
      });

      if (!user) {
        client.emit('error', { message: 'User not found' });
        client.disconnect();
        return null;
      }

      this.connectedUsers.set(client.id, user.id);
      client.data.user = user;
      client.emit('connected', { userId: user.id, message: 'Kết nối thành công' });
      return user.id;
    } catch {
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
      return null;
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    this.authPromises.delete(client.id);
  }

  /**
   * Client gửi event 'joinRoom' với conversationId
   * Server verify membership rồi join socket vào room
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = await this.getUserId(client);
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId,
        },
      },
    });

    if (!member) {
      client.emit('error', { message: 'Bạn không phải thành viên của hội thoại này' });
      return;
    }

    client.join(data.conversationId);
    client.emit('joinedRoom', {
      conversationId: data.conversationId,
      message: 'Đã tham gia phòng chat',
    });
  }

  /**
   * Client gửi event 'leaveRoom' để rời room
   */
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(data.conversationId);
    client.emit('leftRoom', { conversationId: data.conversationId });
  }

  /**
   * Client gửi event 'sendMessage' với conversationId + content
   * Server lưu DB và broadcast 'newMessage' đến cả room
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    const userId = await this.getUserId(client);
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (!data.content?.trim()) {
      client.emit('error', { message: 'Nội dung tin nhắn không được trống' });
      return;
    }

    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId,
        },
      },
    });

    if (!member) {
      client.emit('error', { message: 'Bạn không phải thành viên của hội thoại này' });
      return;
    }

    const msg = await this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: userId,
        content: data.content.trim(),
      },
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

    await this.prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    // Broadcast tin nhắn mới đến toàn bộ room (bao gồm cả sender)
    this.server.to(data.conversationId).emit('newMessage', msg);
  }
}
