import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import type { IUser } from '@/shared/types/user.type';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateProfileDto, AdminUpdateUserDto } from './dto/update-user.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ── Admin: Danh sách tất cả người dùng ──────────────────────────────────
  @Roles('admin')
  @Get('admin/all')
  findAllUsers(@User() user: IUser, @Query() query: QueryUserDto) {
    return this.userService.findAllUsers(user, query);
  }

  // ── Teacher/Admin: Danh sách học viên đã mua khóa học ───────────────────
  @Roles('admin', 'teacher')
  @Get('students')
  findStudents(@User() user: IUser, @Query() query: QueryUserDto) {
    return this.userService.findStudentsOfTeacher(user, query);
  }

  // ── Public: Xem profile theo slug ───────────────────────────────────────
  @PublicAPI()
  @Get('profile/:slug')
  getPublicProfile(@Param('slug') slug: string) {
    return this.userService.getPublicProfile(slug);
  }

  // ── Auth: Cập nhật profile cá nhân ──────────────────────────────────────
  @SkipPermission()
  @Patch('profile')
  updateProfile(@User() user: IUser, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  // ── Auth: Đổi mật khẩu ─────────────────────────────────────────────────
  @SkipPermission()
  @Post('change-password')
  changePassword(@User() user: IUser, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(user.id, dto);
  }

  // ── Admin: Xem chi tiết user ────────────────────────────────────────────
  @Roles('admin')
  @Get('admin/:id')
  getUserDetail(@User() user: IUser, @Param('id') id: string) {
    return this.userService.getUserDetail(user, id);
  }

  // ── Admin: Cập nhật user ────────────────────────────────────────────────
  @Roles('admin')
  @Patch('admin/:id')
  adminUpdateUser(
    @User() user: IUser,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.userService.adminUpdateUser(user, id, dto);
  }

  // ── Admin: Cấm người dùng ──────────────────────────────────────────────
  @Roles('admin')
  @Post('admin/:id/ban')
  banUser(
    @User() user: IUser,
    @Param('id') id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.userService.banUser(user, id, dto);
  }

  // ── Admin: Bỏ cấm người dùng ───────────────────────────────────────────
  @Roles('admin')
  @Post('admin/:id/unban')
  unbanUser(@User() user: IUser, @Param('id') id: string) {
    return this.userService.unbanUser(user, id);
  }

  // ── Admin: Xóa mềm người dùng ──────────────────────────────────────────
  @Roles('admin')
  @Delete('admin/:id')
  softDeleteUser(@User() user: IUser, @Param('id') id: string) {
    return this.userService.softDeleteUser(user, id);
  }

  // ── Admin: Khôi phục người dùng ─────────────────────────────────────────
  @Roles('admin')
  @Post('admin/:id/restore')
  restoreUser(@User() user: IUser, @Param('id') id: string) {
    return this.userService.restoreUser(user, id);
  }
}
