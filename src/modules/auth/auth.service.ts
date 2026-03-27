import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { buildJwtPayload } from '@/shared/utils/auth.util';
import { ROLE_NAME } from '@/shared/constants/auth.constant';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

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
    const { email, password, fullName } = registerDto;

    // Kiểm tra email đã tồn tại chưa
    const existed = await this.prisma.user.findUnique({ where: { email } });
    if (existed) {
      throw new UnauthorizedException('Email already exists');
    }

    // Hash password
    const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT as string));

    // Lấy role mặc định (user)
    const defaultRole = await this.prisma.role.findFirst({ where: { name: ROLE_NAME.USER } });
    if (!defaultRole) {
      throw new UnauthorizedException('Default role not found');
    }

    // Tạo user mới
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hash,
        fullName,
        slug: fullName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        roleId: defaultRole.id,
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
        role: {
          id: user.role.id,
          name: user.role.name,
        },
      },
      ban: user.ban ? {
        id: user.ban.id,
        reason: user.ban.reason,
      } : null,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}
