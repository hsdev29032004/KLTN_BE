import { Controller, Post, Delete, Get, Body } from '@nestjs/common';
import { CartService } from './cart.service';
import { User } from '@/common/decorators/user.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import type { IUser } from '@/shared/types/user.type';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @SkipPermission()
  @Post()
  addToCart(@User() user: IUser, @Body() body: { courseIds: string[] }) {
    return this.cartService.addToCart(user.id, body.courseIds);
  }

  @SkipPermission()
  @Delete()
  removeFromCart(@User() user: IUser, @Body() body: { courseIds: string[] }) {
    return this.cartService.removeFromCart(user.id, body.courseIds);
  }

  @SkipPermission()
  @Get()
  getCart(@User() user: IUser) {
    return this.cartService.getCart(user.id);
  }
}
