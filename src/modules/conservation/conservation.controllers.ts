import { Controller, Get, Param } from '@nestjs/common';
import { ConservationService } from './conservation.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/common/decorators/user.decorator';
import type { IUser } from '@/shared/types/user.type';

@Controller('conversation')
export class ConservationController {
  constructor(private readonly conservationService: ConservationService) {}

  /**
   * Lấy danh sách nhóm chat của giảng viên (dùng instructorId)
   * GET /conversation/instructor/:instructorId
   */
  @PublicAPI()
  @Get('instructor/:instructorId')
  getInstructorConversations(@Param('instructorId') instructorId: string) {
    return this.conservationService.getInstructorConversations(instructorId);
  }

  /**
   * Lấy tất cả conversation mà người dùng đang tham gia
   * GET /conversation/user/:userId
   */
  @PublicAPI()
  @Get('user/:userId')
  getConversationsByUserId(@Param('userId') userId: string) {
    return this.conservationService.getInstructorConversations(userId);
  }

  /**
   * Lấy conversation theo courseId
   * GET /conversation/course/:courseId
   */
  @PublicAPI()
  @Get('course/:courseId')
  getConversationByCourseId(@Param('courseId') courseId: string) {
    return this.conservationService.getConversationByCourseId(courseId);
  }

  /**
   * Lấy chi tiết conversation kèm danh sách message
   * GET /conversation/:conversationId
   */
  @PublicAPI()
  @Get(':conversationId')
  getConversationDetails(@Param('conversationId') conversationId: string) {
    return this.conservationService.getConversationDetails(conversationId);
  }
}
