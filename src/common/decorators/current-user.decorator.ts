import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '../../shared/utils/prisma.util';
const jwtService = new JwtService({});

export const CurrentUser = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    let payload: any;
    try {
      payload = jwtService.decode(token);
    } catch {
      return null;
    }
    if (!payload || !payload.sub) return null;
    // Lấy user từ DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });
    if (!user) return null;
    // Trả về thông tin user, role, permission
    return {
      ...user,
      role: user.role,
      permissions: user.role?.permissions || [],
    };
  },
);
