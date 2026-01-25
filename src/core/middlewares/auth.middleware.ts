import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '@/modules/auth/auth.service';
import { PrismaService } from '@/infras/prisma/prisma.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private authService: AuthService,
    private prismaService: PrismaService,
  ) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    let userAttached = false;

    if (accessToken) {
      try {
        // Giải mã token
        const decoded: any = jwt.verify(
          accessToken,
          process.env.ACCESSTOKEN_SECRET_KEY || '',
        );

        // Lấy thông tin từ token
        const { iat, exp, type, ...userData } = decoded;

        // Query ban nếu có
        const ban = userData.banId
          ? await this.prismaService.ban.findUnique({
            where: { id: userData.banId },
          })
          : null;

        // Query role với permissions
        const role = userData.roleId
          ? await this.prismaService.role.findUnique({
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

        // Attach user vào request
        req.user = {
          ...userData,
          ban,
          role,
        };
        userAttached = true;
      } catch (error) {
        // Token invalid hoặc expired - sẽ thử refresh bên dưới
      }
    }

    // Nếu chưa attach user, thử refresh nếu có refresh_token
    if (!userAttached && refreshToken) {
      try {
        const refreshResult = await this.authService.refreshToken(refreshToken);

        // Set lại cookie
        res.cookie('access_token', refreshResult.accessToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: parseInt(process.env.ACCESSTOKEN_EXPIRE || '300') * 1000,
        });

        res.cookie('refresh_token', refreshResult.refreshToken, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: parseInt(process.env.REFRESHTOKEN_EXPIRE || '8640000') * 1000,
        });

        // Update req để strategy dùng token mới
        req.cookies.access_token = refreshResult.accessToken;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
          req.headers.authorization = `Bearer ${refreshResult.accessToken}`;
        }

        // Decode accessToken mới để lấy userData
        const newDecoded: any = jwt.verify(
          refreshResult.accessToken,
          process.env.ACCESSTOKEN_SECRET_KEY || '',
        );
        const { iat: newIat, exp: newExp, type: newType, ...newUserData } = newDecoded;

        // Query ban nếu có
        const newBan = newUserData.banId
          ? await this.prismaService.ban.findUnique({
            where: { id: newUserData.banId },
          })
          : null;

        // Query role với permissions
        const newRole = newUserData.roleId
          ? await this.prismaService.role.findUnique({
            where: { id: newUserData.roleId },
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          })
          : null;

        // Attach user vào request
        req.user = {
          ...newUserData,
          ban: newBan,
          role: newRole,
        };
        userAttached = true;
      } catch (refreshError) {
        // Refresh failed - không attach user
      }
    }

    next();
  }
}
