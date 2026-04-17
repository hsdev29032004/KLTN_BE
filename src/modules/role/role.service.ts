import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async create(createRoleDto: CreateRoleDto) {
    const { name } = createRoleDto;

    // Check if role already exists
    const existed = await this.prisma.role.findUnique({
      where: { name },
    });

    if (existed) {
      throw new ConflictException('Role already exists');
    }

    return this.prisma.role.create({
      data: {
        name,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (dto.name) {
      const existed = await this.prisma.role.findFirst({ where: { name: dto.name, id: { not: id } } });
      if (existed) throw new ConflictException('Role name already in use');
    }
    return this.prisma.role.update({
      where: { id },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async assignPermission(roleId: string, dto: AssignPermissionDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    let permissionId = dto.permissionId;
    if (!permissionId) {
      if (!dto.api) throw new BadRequestException('permissionId or api is required');
      // create or find permission by api
      let perm = await this.prisma.permission.findFirst({ where: { api: dto.api } });
      if (!perm) {
        perm = await this.prisma.permission.create({ data: { api: dto.api } });
      }
      permissionId = perm.id;
    }

    // upsert rolePermission
    const existing = await this.prisma.rolePermission.findFirst({ where: { roleId, permissionId } });
    if (existing) {
      return this.prisma.rolePermission.update({ where: { id: existing.id }, data: { methods: dto.methods } });
    }

    return this.prisma.rolePermission.create({ data: { roleId, permissionId, methods: dto.methods } });
  }

  async updatePermissionMethods(roleId: string, permissionId: string, dto: UpdateRolePermissionDto) {
    const rp = await this.prisma.rolePermission.findFirst({ where: { roleId, permissionId } });
    if (!rp) throw new NotFoundException('RolePermission not found');
    return this.prisma.rolePermission.update({ where: { id: rp.id }, data: { methods: dto.methods } });
  }

  async removePermission(roleId: string, permissionId: string) {
    const rp = await this.prisma.rolePermission.findFirst({ where: { roleId, permissionId } });
    if (!rp) throw new NotFoundException('RolePermission not found');
    await this.prisma.rolePermission.delete({ where: { id: rp.id } });
    return { message: 'Permission removed from role' };
  }
}
