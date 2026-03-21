import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { User } from '@/common/decorators/user.decorator';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) { }

  // Lấy review theo khóa học - public
  @PublicAPI()
  @Get(':courseId')
  findByCourseId(@Param('courseId') courseId: string) {
    return this.reviewService.findByCourseId(courseId);
  }

  // Lấy 1 review theo id - public
  @PublicAPI()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  // Tạo review - courseId truyền qua body
  @SkipPermission()
  @Post()
  create(@User() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.id, dto);
  }

  // Cập nhật review
  @SkipPermission()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @User() user: any,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, user.id, dto);
  }

  // Xóa mềm review
  @SkipPermission()
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: any) {
    return this.reviewService.remove(id, user.id);
  }
}
