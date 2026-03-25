import { Controller, Get, Param, Query } from '@nestjs/common';
import { CourseService } from './course.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { IUser } from '@/shared/types/user.type';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  @PublicAPI()
  @Get()
  findAll(@Query('ids') ids: string) {
    console.log(ids, 'idsidisidsids');

    if (ids) {
      const idArray = ids.split(',').map(id => id.trim());
      return this.courseService.findByIds(idArray);
    }
    return this.courseService.findAll();
  }

  // Khai báo trước /:slug để tránh bị match nhầm
  @PublicAPI()
  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.courseService.findByUserId(userId);
  }

  @Roles('user')
  @Get('purchased')
  findMy(@User() user: IUser) {
    return this.courseService.findMyCourses(user.id);
  }

  @PublicAPI()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.courseService.findBySlug(slug);
  }

  @PublicAPI()
  @Get('playback/:materialId')
  getPlaybackToken(@Param('materialId') materialId: string, @User() user?: IUser) {
    return this.courseService.getPlaybackToken(materialId, user);
  }
}
