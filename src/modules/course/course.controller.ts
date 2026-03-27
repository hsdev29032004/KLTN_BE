import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { CourseService } from './course.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { IUser } from '@/shared/types/user.type';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @PublicAPI()
  @Get()
  findAll(@Query('ids') ids: string) {
    if (ids) {
      const idArray = ids.split(',').map((id) => id.trim());
      return this.courseService.findByIds(idArray);
    }
    return this.courseService.findAll();
  }

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
  @Get(':key')
  findBySlugOrId(@Param('key') key: string, @User() user: IUser) {
    return this.courseService.findBySlugOrId(key, user);
  }

  @PublicAPI()
  @Get('material/:materialId')
  getMaterial(@Param('materialId') materialId: string, @User() user?: IUser) {
    return this.courseService.getMaterial(materialId, user);
  }

  @Roles('user')
  @Post('purchased')
  purchase(@User() user: IUser, @Body() ids: string[]) {
    return this.courseService.purchaseCourses(user.id, ids);
  }
}
