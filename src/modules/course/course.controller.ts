import { Controller, Get, Param, Query, Post, Body, Put, Delete } from '@nestjs/common';
import { CourseService } from './course.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { IUser } from '@/shared/types/user.type';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonMaterialDto } from './dto/create-lesson-material.dto';
import { UpdateLessonMaterialDto } from './dto/update-lesson-material.dto';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

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
  @Get('material/:materialId')
  getMaterial(@Param('materialId') materialId: string, @User() user?: IUser) {
    return this.courseService.getMaterial(materialId, user);
  }

  @PublicAPI()
  @Get(':key')
  findBySlugOrId(@Param('key') key: string, @User() user: IUser) {
    return this.courseService.findBySlugOrId(key, user);
  }

  // ── Lesson Material CRUD (specific routes first) ──────────────────────────

  @Roles('teacher')
  @Post('lesson/:lessonId/material')
  createLessonMaterial(@User() user: IUser, @Param('lessonId') lessonId: string, @Body() dto: CreateLessonMaterialDto) {
    return this.courseService.createLessonMaterial(user.id, lessonId, dto);
  }

  @Roles('teacher')
  @Put('material/:materialId')
  updateLessonMaterial(@User() user: IUser, @Param('materialId') materialId: string, @Body() dto: UpdateLessonMaterialDto) {
    return this.courseService.updateLessonMaterial(user.id, materialId, dto);
  }

  @Roles('teacher')
  @Delete('material/:materialId')
  deleteLessonMaterial(@User() user: IUser, @Param('materialId') materialId: string) {
    return this.courseService.deleteLessonMaterial(user.id, materialId);
  }

  // ── Lesson CRUD ───────────────────────────────────────────────────────────

  @Roles('teacher')
  @Put('lesson/:lessonId')
  updateLesson(@User() user: IUser, @Param('lessonId') lessonId: string, @Body() dto: UpdateLessonDto) {
    return this.courseService.updateLesson(user.id, lessonId, dto);
  }

  @Roles('teacher')
  @Delete('lesson/:lessonId')
  deleteLesson(@User() user: IUser, @Param('lessonId') lessonId: string) {
    return this.courseService.deleteLesson(user.id, lessonId);
  }

  // ── Course CRUD ───────────────────────────────────────────────────────────

  @Roles('user')
  @Post('purchased')
  purchase(@User() user: IUser, @Body() ids: string[]) {
    return this.courseService.purchaseCourses(user.id, ids);
  }

  @Roles('teacher')
  @Post()
  createCourse(@User() user: IUser, @Body() dto: CreateCourseDto) {
    return this.courseService.createCourse(user.id, dto);
  }

  @Roles('teacher')
  @Post(':courseId/submit-review')
  submitForReview(@User() user: IUser, @Param('courseId') courseId: string) {
    return this.courseService.submitForReview(user.id, courseId);
  }

  @Roles('admin')
  @Post(':courseId/publish')
  publishCourse(@User() user: IUser, @Param('courseId') courseId: string) {
    return this.courseService.publishCourse(user.id, courseId);
  }

  @Roles('teacher')
  @Post(':courseId/lesson')
  createLesson(@User() user: IUser, @Param('courseId') courseId: string, @Body() dto: CreateLessonDto) {
    return this.courseService.createLesson(user.id, courseId, dto);
  }

  @Roles('teacher')
  @Put(':courseId')
  updateCourse(@User() user: IUser, @Param('courseId') courseId: string, @Body() dto: UpdateCourseDto) {
    return this.courseService.updateCourse(user.id, courseId, dto);
  }

  @Roles('teacher')
  @Delete(':courseId')
  deleteCourse(@User() user: IUser, @Param('courseId') courseId: string) {
    return this.courseService.deleteCourse(user.id, courseId);
  }
}
