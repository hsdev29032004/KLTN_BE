// stat.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { StatService } from './stat.service';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import type { IUser } from '@/shared/types/user.type';
import {
  QueryRevenueDto,
  QueryUserStatDto,
  QueryCourseStatDto,
} from './dto/query-stat.dto';

@Controller('stat')
export class StatController {
  constructor(private readonly statService: StatService) {}

  // ── Admin: Dashboard Overview ─────────────────────────────────────────
  @Roles('admin')
  @Get('dashboard')
  getDashboardOverview() {
    return this.statService.getDashboardOverview();
  }

  // ── Admin: Thống kê doanh thu ─────────────────────────────────────────
  @Roles('admin')
  @Get('revenue')
  getRevenueStats(@Query() query: QueryRevenueDto) {
    return this.statService.getRevenueStats(query);
  }

  // ── Admin: Doanh thu theo giảng viên ──────────────────────────────────
  @Roles('admin')
  @Get('revenue/by-teacher')
  getRevenueByTeacher(@Query() query: QueryRevenueDto) {
    return this.statService.getRevenueByTeacher(query);
  }

  // ── Admin: Doanh thu theo khóa học ────────────────────────────────────
  @Roles('admin')
  @Get('revenue/by-course')
  getRevenueByCourse(@Query() query: QueryRevenueDto) {
    return this.statService.getRevenueByCourse(query);
  }

  // ── Admin: Thống kê người dùng ────────────────────────────────────────
  @Roles('admin')
  @Get('users')
  getUserStats(@Query() query: QueryUserStatDto) {
    return this.statService.getUserStats(query);
  }

  // ── Admin: Thống kê khóa học ──────────────────────────────────────────
  @Roles('admin')
  @Get('courses')
  getCourseStats(@Query() query: QueryCourseStatDto) {
    return this.statService.getCourseStats(query);
  }

  // ── Giảng viên: Thống kê cá nhân ─────────────────────────────────────
  @SkipPermission()
  @Get('lecturer')
  getInstructorStat(@User() user: IUser) {
    return this.statService.getInstructorStat(user.id);
  }

  // ── Admin: Legacy (tương thích cũ) ────────────────────────────────────
  @Roles('admin')
  @Get('admin')
  getAdminStat() {
    return this.statService.getAdminStat();
  }

  // ── Học viên khóa học ─────────────────────────────────────────────────
  @SkipPermission()
  @Get('course/:courseId/students')
  getCourseStudents(@Param('courseId') courseId: string, @User() user: IUser) {
    return this.statService.getCourseStudents(courseId, user);
  }
}
