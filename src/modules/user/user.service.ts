import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { ROLE_NAME } from '@/shared/constants/auth.constant';
import type { IUser } from '@/shared/types/user.type';
import type { QueryUserDto } from './dto/query-user.dto';
import type {
  UpdateProfileDto,
  AdminUpdateUserDto,
} from './dto/update-user.dto';
import type { BanUserDto } from './dto/ban-user.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  avatar: true,
  slug: true,
  introduce: true,
  roleId: true,
  banId: true,
  isDeleted: true,
  timeBan: true,
  timeUnBan: true,
  availableAmount: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
  ban: { select: { id: true, reason: true } },
};

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin: Danh sách tất cả người dùng ────────────────────────────────────

  async findAllUsers(user: IUser, query: QueryUserDto) {
    const {
      search,
      roleId,
      roleName,
      isBanned,
      isDeleted,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(query.limit as string) || 20),
    );

    const roleCurrent = user.role?.name;
    if (roleCurrent !== ROLE_NAME.ADMIN) {
      throw new ForbiddenException(
        'Bạn không có quyền xem danh sách người dùng',
      );
    }

    const where: Prisma.UserWhereInput = {};

    // Tìm kiếm theo tên hoặc email
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Lọc theo role
    if (roleId) {
      where.roleId = roleId;
    } else if (roleName) {
      where.role = { name: { equals: roleName, mode: 'insensitive' } };
    }

    // Lọc theo trạng thái ban
    if (isBanned === 'true') {
      where.banId = { not: null };
      where.timeUnBan = { gt: new Date() };
    } else if (isBanned === 'false') {
      where.OR = [
        { banId: null },
        { timeUnBan: { lte: new Date() } },
        { timeUnBan: null },
      ];
      // Nếu đã có OR từ search, merge lại
      if (search) {
        where.AND = [
          {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { banId: null },
              { timeUnBan: { lte: new Date() } },
              { timeUnBan: null },
            ],
          },
        ];
        delete where.OR;
      }
    }

    // Lọc theo trạng thái xóa
    if (isDeleted === 'true') {
      where.isDeleted = true;
    } else if (isDeleted === 'false') {
      where.isDeleted = false;
    }

    // Lọc theo ngày tạo
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!isNaN(from.getTime())) (where.createdAt as any).gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          (where.createdAt as any).lte = to;
        }
      }
    }

    // Sắp xếp an toàn
    const allowedSortFields = [
      'createdAt',
      'fullName',
      'email',
      'availableAmount',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...USER_SELECT,
          _count: {
            select: {
              courses: true,
              userCourses: true,
              invoices: true,
            },
          },
        },
        orderBy: { [safeSortBy]: order === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      message: 'Lấy danh sách người dùng thành công',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Teacher: Danh sách học viên đã mua khóa học ──────────────────────────

  async findStudentsOfTeacher(user: IUser, query: QueryUserDto) {
    const {
      search,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(query.limit as string) || 20),
    );

    const roleCurrent = user.role?.name;
    if (roleCurrent !== ROLE_NAME.TEACHER && roleCurrent !== ROLE_NAME.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách học viên');
    }

    // Tìm user đã mua khóa học của giảng viên hiện tại
    const where: Prisma.UserCourseWhereInput = {
      course: {
        userId: roleCurrent === ROLE_NAME.ADMIN ? undefined : user.id,
        isDeleted: false,
      },
    };

    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        const from = new Date(fromDate);
        if (!isNaN(from.getTime())) (where.createdAt as any).gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          (where.createdAt as any).lte = to;
        }
      }
    }

    const allowedSortFields = ['createdAt'];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.userCourse.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatar: true,
              slug: true,
              createdAt: true,
            },
          },
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
            },
          },
        },
        orderBy: { [safeSortBy]: order === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userCourse.count({ where }),
    ]);

    return {
      message: 'Lấy danh sách học viên thành công',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Xem chi tiết user ─────────────────────────────────────────────────────

  async getUserDetail(currentUser: IUser, userId: string) {
    const roleCurrent = currentUser.role?.name;
    const isAdmin = roleCurrent === ROLE_NAME.ADMIN;
    const isSelf = currentUser.id === userId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin này');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...USER_SELECT,
        _count: {
          select: {
            courses: true,
            userCourses: true,
            reviews: true,
            invoices: true,
            transactions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return {
      message: 'Lấy thông tin người dùng thành công',
      data: user,
    };
  }

  // ── Public: Xem profile theo slug ─────────────────────────────────────────

  async getPublicProfile(slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { slug, isDeleted: false },
      select: {
        id: true,
        fullName: true,
        avatar: true,
        slug: true,
        introduce: true,
        createdAt: true,
        courses: {
          where: { isDeleted: false, status: 'published' },
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            price: true,
            star: true,
            studentCount: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            courses: { where: { isDeleted: false, status: 'published' } },
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return {
      message: 'Lấy thông tin profile thành công',
      data: user,
    };
  }

  // ── Cập nhật profile cá nhân ──────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
      data.slug =
        dto.fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    }
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.introduce !== undefined) data.introduce = dto.introduce;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });

    return {
      message: 'Cập nhật thông tin thành công',
      data: updated,
    };
  }

  // ── Đổi mật khẩu ─────────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const hash = await bcrypt.hash(
      dto.newPassword,
      parseInt(process.env.BCRYPT_SALT as string),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ── Admin: Cập nhật user ──────────────────────────────────────────────────

  async adminUpdateUser(
    adminUser: IUser,
    userId: string,
    dto: AdminUpdateUserDto,
  ) {
    if (adminUser.role?.name !== ROLE_NAME.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
      data.slug =
        dto.fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    }
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.introduce !== undefined) data.introduce = dto.introduce;
    if (dto.roleId !== undefined) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) throw new BadRequestException('Role không tồn tại');
      data.role = { connect: { id: dto.roleId } };
    }
    if (dto.availableAmount !== undefined) {
      if (dto.availableAmount < 0) {
        throw new BadRequestException('Số dư khả dụng không được âm');
      }
      data.availableAmount = dto.availableAmount;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });

    return {
      message: 'Cập nhật người dùng thành công',
      data: updated,
    };
  }

  // ── Admin: Cấm người dùng ─────────────────────────────────────────────────

  async banUser(adminUser: IUser, userId: string, dto: BanUserDto) {
    if (adminUser.role?.name !== ROLE_NAME.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (user.id === adminUser.id) {
      throw new BadRequestException('Không thể cấm chính mình');
    }

    // Tạo ban record & liên kết với user
    const timeUnBan = dto.timeUnBan ? new Date(dto.timeUnBan) : null;
    if (timeUnBan && isNaN(timeUnBan.getTime())) {
      throw new BadRequestException('timeUnBan không hợp lệ');
    }

    const ban = await this.prisma.ban.create({
      data: { reason: dto.reason },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        banId: ban.id,
        timeBan: new Date(),
        timeUnBan,
      },
      select: {
        ...USER_SELECT,
        timeBan: true,
        timeUnBan: true,
      },
    });

    return {
      message: 'Cấm người dùng thành công',
      data: updated,
    };
  }

  // ── Admin: Bỏ cấm người dùng ─────────────────────────────────────────────

  async unbanUser(adminUser: IUser, userId: string) {
    if (adminUser.role?.name !== ROLE_NAME.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (!user.banId) {
      throw new BadRequestException('Người dùng không bị cấm');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        banId: null,
        timeBan: null,
        timeUnBan: null,
      },
      select: USER_SELECT,
    });

    return {
      message: 'Bỏ cấm người dùng thành công',
      data: updated,
    };
  }

  // ── Admin: Soft delete / restore ──────────────────────────────────────────

  async softDeleteUser(adminUser: IUser, userId: string) {
    if (adminUser.role?.name !== ROLE_NAME.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (user.id === adminUser.id) {
      throw new BadRequestException('Không thể xóa chính mình');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true, deletedAt: new Date() },
      select: USER_SELECT,
    });

    return {
      message: 'Xóa người dùng thành công',
      data: updated,
    };
  }

  async restoreUser(adminUser: IUser, userId: string) {
    if (adminUser.role?.name !== ROLE_NAME.ADMIN) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isDeleted: false, deletedAt: null },
      select: USER_SELECT,
    });

    return {
      message: 'Khôi phục người dùng thành công',
      data: updated,
    };
  }
}
