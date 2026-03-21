import { Controller, Get, Param } from '@nestjs/common';
import { CourseService } from './course.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  @PublicAPI()
  @Get()
  findAll() {
    return this.courseService.findAll();
  }

  // Khai báo trước /:slug để tránh bị match nhầm
  @PublicAPI()
  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.courseService.findByUserId(userId);
  }

  @Roles('user')
  @Get('my-courses')
  findMy(@User() user: any) {
    console.log(user);

    return this.courseService.findMyCourses(user.id);
  }

  @PublicAPI()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.courseService.findBySlug(slug);
  }
}
