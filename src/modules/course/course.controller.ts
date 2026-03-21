import { Controller, Get, Param } from '@nestjs/common';
import { CourseService } from './course.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';

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

  @PublicAPI()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.courseService.findBySlug(slug);
  }
}
