import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { PrismaService } from '../../infras/prisma/prisma.service';
import { UpdateSystemInfoDto } from './dto/update-system-info.dto';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) { }

  async getSystem() {
    return this.prisma.system.findUnique({
      where: { id: 'system' },
      select: {
        id: true,
        contact: true,
        comissionRate: true,
        term: true,
        updatedAt: true,
      },
    });
  }

  async updateSystem(updateSystemInfoDto: UpdateSystemInfoDto) {
    // Validate commission rate range defensively in service layer
    if (
      updateSystemInfoDto.comissionRate !== undefined &&
      (updateSystemInfoDto.comissionRate < 0 || updateSystemInfoDto.comissionRate > 100)
    ) {
      throw new BadRequestException('Tỷ lệ hoa hồng phải nằm trong khoảng 0-100');
    }
    return this.prisma.system.update({
      where: { id: 'system' },
      data: {
        comissionRate: updateSystemInfoDto.comissionRate ?? undefined,
        contact: updateSystemInfoDto.contact ?? undefined,
        term: updateSystemInfoDto.term ?? undefined,
      },
      select: {
        id: true,
        contact: true,
        comissionRate: true,
        term: true,
        updatedAt: true,
      },
    });
  }

  async getBanks() {
    return this.prisma.bank.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        bankNumber: true,
        bankName: true,
        recipient: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(createSystemDto: CreateSystemDto) {
    return this.prisma.bank.create({
      data: {
        bankNumber: createSystemDto.bankNumber,
        bankName: createSystemDto.bankName,
        recipient: createSystemDto.recipient,
        system: {
          connect: { id: 'system' },
        },
      },
    });
  }

  async updateBank(id: string, updateSystemDto: UpdateSystemDto) {
    return this.prisma.bank.update({
      where: { id },
      data: {
        bankNumber: updateSystemDto.bankNumber ?? undefined,
        bankName: updateSystemDto.bankName ?? undefined,
        recipient: updateSystemDto.recipient ?? undefined,
        isDeleted: updateSystemDto['isDeleted'] ?? undefined,
      },
    });
  }

  async deleteBank(id: string) {
    return this.prisma.bank.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  findAll() {
    return `This action returns all system`;
  }

  findOne(id: number) {
    return `This action returns a #${id} system`;
  }

  update(id: number, updateSystemDto: UpdateSystemDto) {
    return `This action updates a #${id} system`;
  }

  remove(id: number) {
    return `This action removes a #${id} system`;
  }
}
