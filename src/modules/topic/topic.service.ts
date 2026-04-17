import { Injectable } from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { PrismaService } from '@/infras/prisma/prisma.service';
@Injectable()
export class TopicService {
  constructor(private readonly prisma: PrismaService) { }
  create(createTopicDto: CreateTopicDto) {
    return 'This action adds a new topic';
  }

  async findAll() {
    const topics = await this.prisma.topic.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return topics;
  }

  findOne(id: number) {
    return `This action returns a #${id} topic`;
  }

  update(id: number, updateTopicDto: UpdateTopicDto) {
    return `This action updates a #${id} topic`;
  }

  remove(id: number) {
    return `This action removes a #${id} topic`;
  }
}
