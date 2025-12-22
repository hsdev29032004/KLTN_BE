import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public-api.decorator';

interface Permission {
  route: string;
  method: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !Array.isArray(user.permissions)) {
      throw new ForbiddenException('No permissions found');
    }
    const permissions: Permission[] = user.permissions;
    const reqRoute = request.route?.path || request.path;
    const reqMethod = request.method?.toLowerCase();

    const allowed = permissions.some(
      (p) =>
        p.route === reqRoute &&
        p.method.toLowerCase() === reqMethod
    );
    if (!allowed) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
    return true;
  }
}
