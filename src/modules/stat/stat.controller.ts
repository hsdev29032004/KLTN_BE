// stat.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { StatService } from './stat.service';
import { User } from '@/common/decorators/user.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import type { IUser } from '@/shared/types/user.type';

@Controller('stat')
export class StatController {
  constructor(private readonly statService: StatService) { }

  @SkipPermission()
  @Get('lecturer')
  getInstructorStat(@User() user: IUser) {
    return this.statService.getInstructorStat(user.id);
  }

  @Get('admin')
  getAdminStat() {
    return this.statService.getAdminStat();
  }

  // courses.controller.ts (thêm vào controller hiện có)
  @SkipPermission()
  @Get('course/:courseId/students')
  getCourseStudents(
    @Param('courseId') courseId: string,
    @User() user: IUser,
  ) {
    return this.statService.getCourseStudents(courseId, user);
  }
}