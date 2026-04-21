import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { CacheService } from '@/infras/cache/cache.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { MailService } from '@/infras/mail/mail.service';
import { buildJwtPayload } from '@/shared/utils/auth.util';
import { ROLE_NAME } from '@/shared/constants/auth.constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private cacheService: CacheService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email) {
      throw new UnauthorizedException('Email is required');
    }
    if (!password) {
      throw new UnauthorizedException('Password is required');
    }

    // Tìm user theo email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        ban: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Kiểm tra password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Kiểm tra user có bị ban không
    if (user.banId && user.timeUnBan && new Date() < user.timeUnBan) {
      throw new UnauthorizedException('User is banned');
    }

    // Generate tokens với toàn bộ data user (trừ password)
    const payload = buildJwtPayload(user);

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.ACCESSTOKEN_SECRET_KEY,
      expiresIn: parseInt(process.env.ACCESSTOKEN_EXPIRE || '300'),
    });

    // For refresh token, create manually with different secret
    const refreshTokenPayload = { ...payload, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: process.env.REFRESHTOKEN_SECRET_KEY,
      expiresIn: parseInt(process.env.REFRESHTOKEN_EXPIRE || '8640000'),
    });

    // Lưu refresh token vào database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    const { password: _, refreshToken: __, ...rest } = user;

    return {
      accessToken,
      refreshToken,
      user: rest,
    };
  }
  async register(registerDto: any) {
    if (!registerDto || typeof registerDto !== 'object') {
      throw new UnauthorizedException('Invalid register payload');
    }

    // Support both `name` and `fullName` from client payloads
    const email = registerDto.email;
    const password = registerDto.password;
    const fullName = registerDto.fullName ?? registerDto.name ?? '';
    const bankNumber = registerDto.bankNumber ?? null;
    const bankName = registerDto.bankName ?? null;
    // normalize role to lowercase string
    const role =
      typeof registerDto.role === 'string'
        ? registerDto.role.toLowerCase()
        : undefined;

    // Kiểm tra email đã tồn tại chưa
    const existed = await this.prisma.user.findUnique({ where: { email } });
    if (existed) {
      throw new UnauthorizedException('Email already exists');
    }

    if (!email || !password || !fullName || !role) {
      throw new UnauthorizedException('Missing required fields');
    }

    // Hash password
    const hash = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_SALT as string),
    );

    // Lấy role mặc định (user)
    const defaultRole = await this.prisma.role.findFirst({
      where: { name: ROLE_NAME.USER },
    });
    if (!defaultRole) {
      throw new UnauthorizedException('Default role not found');
    }

    // Nếu client gửi role là 'teacher' thì gán role tương ứng, ngược lại dùng 'user'
    let assignedRole = defaultRole;
    if (role && role === ROLE_NAME.TEACHER.toLowerCase()) {
      const teacherRole = await this.prisma.role.findFirst({
        where: { name: ROLE_NAME.TEACHER },
      });
      if (!teacherRole)
        throw new UnauthorizedException('Requested role not found');
      assignedRole = teacherRole;
    }

    // Tạo user mới
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        fullName,
        bankNumber,
        bankName,
        slug: fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        roleId: assignedRole.id,
      },
      include: {
        role: true,
      },
    });

    // Trả về thông tin user (không trả password)
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      slug: user.slug,
      avatar: user.avatar,
      role: user.role,
    };
  }

  // Request a password reset code sent to the user's email
  async requestPasswordReset(email: string) {
    const normEmail = (email || '').toString().trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normEmail },
    });
    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = parseInt(process.env.PWD_RESET_TTL || '600'); // seconds
    const key = `pwd_reset:${normEmail}`;
    await this.cacheService.set(key, code, ttl);

    const subject = 'Mã đặt lại mật khẩu';
    const text = `Mã đặt lại mật khẩu của bạn là: ${code}. Mã sẽ hết hạn sau ${ttl} giây.`;

    // Log code in non-production to help debugging tests
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `Password reset code for ${normEmail}: ${code} (ttl=${ttl}s)`,
      );
    }

    await this.mailService.sendMail(normEmail, subject, text);

    return { message: 'Mã xác thực đã được gửi tới email nếu tồn tại' };
  }

  // Confirm code + update password
  async resetPassword(payload: {
    email: string;
    code: string;
    newPassword: string;
  }) {
    const { email, code, newPassword } = payload;
    const normEmail = (email || '').toString().trim().toLowerCase();
    const submittedCode = (code || '').toString().trim();
    const key = `pwd_reset:${normEmail}`;
    const cached: string | undefined = await this.cacheService.get(key);

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `Verifying reset code for ${normEmail}: submitted=${submittedCode}, cached=${cached}`,
      );
    }

    if (!cached || cached !== submittedCode) {
      throw new UnauthorizedException('Mã không hợp lệ hoặc đã hết hạn');
    }

    const hash = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_SALT as string),
    );

    await this.prisma.user.update({
      where: { email: normEmail },
      data: { password: hash },
    });

    await this.cacheService.del(key);

    return { message: 'Cập nhật mật khẩu thành công' };
  }

  async fetchMe(accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException({
        message: 'Access token is required',
        refresh: true,
      });
    }

    // Giải mã accessToken
    let decoded: any;
    try {
      decoded = this.jwtService.verify(accessToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Lấy thông tin từ token (đã có đầy đủ thông tin user)
    const { iat, exp, type, ...userData } = decoded;

    // Query ban nếu có
    const ban = userData.banId
      ? await this.prisma.ban.findUnique({
          where: { id: userData.banId },
        })
      : null;

    // Query role với permissions
    const role = userData.roleId
      ? await this.prisma.role.findUnique({
          where: { id: userData.roleId },
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        })
      : null;

    return {
      user: {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        avatar: userData.avatar,
        bankNumber: userData.bankNumber ?? null,
        bankName: userData.bankName ?? null,
        role,
        ban,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let decoded: any;
    try {
      decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESHTOKEN_SECRET_KEY,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: decoded.id,
        refreshToken: refreshToken,
        isDeleted: false,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        ban: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.banId && user.timeUnBan && new Date() < user.timeUnBan) {
      throw new UnauthorizedException('User is banned');
    }

    const payload = buildJwtPayload(user);

    const newAccessToken = this.jwtService.sign(payload, {
      secret: process.env.ACCESSTOKEN_SECRET_KEY,
      expiresIn: parseInt(process.env.ACCESSTOKEN_EXPIRE || '300'),
    });

    const refreshTokenPayload = { ...payload, type: 'refresh' };
    const newRefreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: process.env.REFRESHTOKEN_SECRET_KEY,
      expiresIn: parseInt(process.env.REFRESHTOKEN_EXPIRE || '8640000'),
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        bankNumber: user.bankNumber ?? null,
        bankName: user.bankName ?? null,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
      },
      ban: user.ban
        ? {
            id: user.ban.id,
            reason: user.ban.reason,
          }
        : null,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}
