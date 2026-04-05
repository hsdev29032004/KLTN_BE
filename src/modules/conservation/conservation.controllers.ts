import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ConservationService } from './conservation.service';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { User } from '@/common/decorators/user.decorator';
import type { IUser } from '@/shared/types/user.type';

@Controller('conversation')
export class ConservationController {
  constructor(private readonly conservationService: ConservationService) { }

  /**
   * Lấy danh sách hội thoại của user (qua ConversationMember)
   * GET /conversation/my
   */
  @SkipPermission()
  @Get('my')
  getMyConversations(@User() user: IUser) {
    return this.conservationService.getMyConversations(user.id);
  }

  /**
   * Lấy chi tiết hội thoại + messages (phân trang)
   * GET /conversation/:conversationId
   */
  @SkipPermission()
  @Get(':conversationId')
  getConversationDetail(
    @User() user: IUser,
    @Param('conversationId') conversationId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.conservationService.getConversationDetail(user.id, conversationId, query);
  }

  /**
   * Gửi tin nhắn mới
   * POST /conversation/:conversationId/messages
   */
  @SkipPermission()
  @Post(':conversationId/messages')
  sendMessage(
    @User() user: IUser,
    @Param('conversationId') conversationId: string,
    @Body('content') content: string,
  ) {
    return this.conservationService.sendMessage(user.id, conversationId, content);
  }
}
