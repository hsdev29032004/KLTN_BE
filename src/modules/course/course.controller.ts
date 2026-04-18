import { Controller, Get, Param, Query, Post, Body, Put, Delete, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { IUser } from '@/shared/types/user.type';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { SearchCourseDto } from './dto/search-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonMaterialDto } from './dto/create-lesson-material.dto';
import { UpdateLessonMaterialDto } from './dto/update-lesson-material.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { RejectCourseDto } from './dto/reject-course.dto';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  @Roles('admin')
  @Get('admin/all')
  findAllForAdmin(@Query() query: Record<string, string>) {
    return this.courseService.findAllForAdmin(query);
  }

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
  @Get('search')
  search(@Query() dto: SearchCourseDto) {
    return this.courseService.searchCourses(dto);
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
  @UseInterceptors(FileInterceptor('file'))
  createLessonMaterial(@User() user: IUser, @Param('lessonId') lessonId: string, @Body() dto: CreateLessonMaterialDto, @UploadedFile() file?: Express.Multer.File) {
    return this.courseService.createLessonMaterial(user.id, lessonId, dto, file);
  }

  @Roles('teacher')
  @Put('material/:materialId')
  @UseInterceptors(FileInterceptor('file'))
  updateLessonMaterial(@User() user: IUser, @Param('materialId') materialId: string, @Body() dto: UpdateLessonMaterialDto, @UploadedFile() file?: Express.Multer.File) {
    return this.courseService.updateLessonMaterial(user.id, materialId, dto, file);
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
  purchase(@User() user: IUser, @Body() ids: string[], @Req() req: any) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    return this.courseService.purchaseCourses(user.id, ids, ip);
  }

  @Roles('teacher')
  @Post()
  @UseInterceptors(FileInterceptor('thumbnail'))
  createCourse(@User() user: IUser, @Body() dto: CreateCourseDto, @UploadedFile() thumbnail?: Express.Multer.File) {
    return this.courseService.createCourse(user.id, dto, thumbnail);
  }

  @Roles('teacher')
  @Post(':courseId/submit-review')
  submitForReview(@User() user: IUser, @Param('courseId') courseId: string, @Body() dto: SubmitReviewDto) {
    return this.courseService.submitForReview(user.id, courseId, dto.description);
  }

  @Roles('teacher')
  @Post(':courseId/reopen')
  reopenCourse(@User() user: IUser, @Param('courseId') courseId: string) {
    return this.courseService.reopenCourse(user.id, courseId);
  }

  @Roles('admin')
  @Post(':courseId/publish')
  publishCourse(@User() user: IUser, @Param('courseId') courseId: string) {
    return this.courseService.publishCourse(user.id, courseId);
  }

  @Roles('admin')
  @Post(':courseId/reject')
  rejectCourse(@User() user: IUser, @Param('courseId') courseId: string, @Body() dto: RejectCourseDto) {
    return this.courseService.rejectCourse(user.id, courseId, dto.reason);
  }

  @Roles('teacher')
  @Post(':courseId/lesson')
  createLesson(@User() user: IUser, @Param('courseId') courseId: string, @Body() dto: CreateLessonDto) {
    return this.courseService.createLesson(user.id, courseId, dto);
  }

  @Roles('teacher')
  @Put(':courseId')
  @UseInterceptors(FileInterceptor('thumbnail'))
  updateCourse(@User() user: IUser, @Param('courseId') courseId: string, @Body() dto: UpdateCourseDto, @UploadedFile() thumbnail?: Express.Multer.File) {
    return this.courseService.updateCourse(user.id, courseId, dto, thumbnail);
  }

  @Roles('teacher')
  @Delete(':courseId')
  deleteCourse(@User() user: IUser, @Param('courseId') courseId: string) {
    return this.courseService.deleteCourse(user.id, courseId);
  }
}
