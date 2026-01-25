import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async create(createPermissionDto: CreatePermissionDto) {
    const { api } = createPermissionDto;

    // Check if permission already exists
    const existed = await this.prisma.permission.findFirst({
      where: {
        api,
      },
    });

    if (existed) {
      throw new ConflictException('Permission with this api already exists');
    }

    return this.prisma.permission.create({
      data: {
        api,
      },
      include: {
        rolePermissions: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}
