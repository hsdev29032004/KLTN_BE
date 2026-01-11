import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

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
}
