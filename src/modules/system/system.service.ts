import { Injectable } from '@nestjs/common';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { PrismaService } from '../../infras/prisma/prisma.service';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

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
