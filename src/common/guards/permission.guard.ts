import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public-api.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SKIP_PERMISSION_KEY } from '../decorators/authenticated.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Check nếu là Public API thì cho qua
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Nếu không có user thì không cho qua (đã fail ở JwtAuthGuard)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 2. Check nếu có @SkipPermission decorator => chỉ cần đăng nhập, không check permission
    const skipPermission = this.reflector.getAllAndOverride<boolean>(SKIP_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipPermission) return true;

    // 3. Check nếu có @Roles decorator => chỉ check role, không check permission DB
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      // Chỉ check role của user
      const userRole = user.role?.name?.toLowerCase();
      const hasRole = requiredRoles.some(role => role.toLowerCase() === userRole);
      
      if (!hasRole) {
        throw new ForbiddenException(
          `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
        );
      }
      return true;
    }

    // 4. Nếu không có @Roles => check RBAC (api và method trong RolePermission model)
    // Lấy thông tin request
    const reqPath = this.normalizeApiPath(request.route?.path || request.path);
    const reqMethod = request.method?.toUpperCase();

    // Nếu user không có role hoặc rolePermissions thì không cho qua
    if (!user.role || !user.role.rolePermissions || !Array.isArray(user.role.rolePermissions)) {
      throw new ForbiddenException('No permissions found for user');
    }

    // Check permissions
    const rolePermissions = user.role.rolePermissions;
    const allowed = rolePermissions.some((rolePermission: any) => {
      const permission = rolePermission.permission;
      if (!permission) return false;

      const permissionApi = this.normalizeApiPath(permission.api);
      const permissionMethods = (rolePermission.methods || '').toUpperCase();

      // Check api path match by comparing the first two path segments.
      const apiMatch = this.getPathPrefix(permissionApi, 2) === this.getPathPrefix(reqPath, 2);
      if (!apiMatch) return false;

      // Check method match
      // Nếu là ALL thì chấp nhận tất cả methods
      if (permissionMethods === 'ALL') return true;

      // Methods may be separated by '|' or ',' — accept both
      const allowedMethods = permissionMethods.split(/[|,]/).map((m: string) => m.trim()).filter(Boolean);
      return allowedMethods.includes(reqMethod);
    });

    if (!allowed) {
      throw new ForbiddenException(
        `You do not have permission to ${reqMethod} ${reqPath}`,
      );
    }

    return true;
  }

  /**
   * Normalize API path: remove trailing slash, remove base path nếu có
   */
  private normalizeApiPath(path: string): string {
    if (!path) return '';
    // Remove trailing slash
    let normalized = path.replace(/\/$/, '');
    // Remove leading slash for comparison
    normalized = normalized.replace(/^\//, '');
    return normalized;
  }

  /**
   * Return prefix of a path composed of first `levels` segments.
   * Example: getPathPrefix('api/roles/123/more', 2) -> 'api/roles'
   */
  private getPathPrefix(path: string, levels = 2): string {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    return parts.slice(0, Math.max(1, levels)).join('/');
  }
}
