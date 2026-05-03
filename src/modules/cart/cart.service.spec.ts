import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { CourseStatus } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let mockPrisma: any;

  const userId = 'user-1';

  const baseCourse = (id: string, price = 100000) => ({
    id,
    name: `Khóa học ${id}`,
    slug: id,
    thumbnail: null,
    price,
    star: 5,
    status: CourseStatus.published,
    userId: 'owner-1',
    user: { id: 'owner-1', fullName: 'Owner', avatar: null },
  });

  beforeEach(async () => {
    mockPrisma = {
      course: { findMany: jest.fn() },
      detailInvoices: { findMany: jest.fn() },
      cartItem: {
        findMany: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  // ────────────────────────────── addToCart() ──────────────────────────────

  describe('addToCart()', () => {
    it('UN_CART_1 – courseIds rỗng → BadRequestException', async () => {
      await expect(service.addToCart(userId, []))
        .rejects.toThrow(new BadRequestException('Danh sách khóa học rỗng'));
    });

    it('UN_CART_2 – Không có course hợp lệ → BadRequestException', async () => {
      mockPrisma.course.findMany.mockResolvedValue([]);

      await expect(service.addToCart(userId, ['invalid']))
        .rejects.toThrow(new BadRequestException('Không có khóa học hợp lệ'));
    });

    it('UN_CART_3 – Thêm mới + bỏ qua trùng → added:1, skipped:1', async () => {
      const c1 = baseCourse('c1');
      const c2 = baseCourse('c2');

      mockPrisma.course.findMany.mockResolvedValue([c1, c2]);
      mockPrisma.detailInvoices.findMany.mockResolvedValue([]);
      // c1 đã trong giỏ, c2 chưa
      mockPrisma.cartItem.findMany.mockResolvedValue([{ courseId: 'c1' }]);
      mockPrisma.cartItem.createMany.mockResolvedValue({ count: 1 });

      const result = await service.addToCart(userId, ['c1', 'c2']);

      expect(result.data.added).toBe(1);
      expect(result.data.skipped).toBe(1);
      expect(mockPrisma.cartItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ userId, courseId: 'c2' }],
        }),
      );
    });

    it('UN_CART_4 – Course đã mua → bỏ qua, added:0', async () => {
      mockPrisma.course.findMany.mockResolvedValue([baseCourse('c1')]);
      mockPrisma.detailInvoices.findMany.mockResolvedValue([{ courseId: 'c1' }]);

      const result = await service.addToCart(userId, ['c1']);

      expect(result.data.added).toBe(0);
      expect(mockPrisma.cartItem.createMany).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────── removeFromCart() ──────────────────────────────

  describe('removeFromCart()', () => {
    it('UN_CART_5 – courseIds rỗng → BadRequestException', async () => {
      await expect(service.removeFromCart(userId, []))
        .rejects.toThrow(new BadRequestException('Danh sách khóa học rỗng'));
    });

    it('UN_CART_6 – Xóa thành công → removed:2', async () => {
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.removeFromCart(userId, ['c1', 'c2']);

      expect(result.data.removed).toBe(2);
      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId, courseId: { in: ['c1', 'c2'] } },
      });
    });
  });

  // ────────────────────────────── getCart() ──────────────────────────────

  describe('getCart()', () => {
    it('UN_CART_7 – Giỏ rỗng → totalPrice:0, count:0', async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([]);

      const result = await service.getCart(userId);

      expect(result.data.items).toEqual([]);
      expect(result.data.totalPrice).toBe(0);
      expect(result.data.count).toBe(0);
    });

    it('UN_CART_8 – Có 2 items → totalPrice:300000, count:2', async () => {
      const items = [
        { id: 'ci-1', courseId: 'c1', createdAt: new Date(), course: { ...baseCourse('c1', 100000) } },
        { id: 'ci-2', courseId: 'c2', createdAt: new Date(), course: { ...baseCourse('c2', 200000) } },
      ];
      mockPrisma.cartItem.findMany.mockResolvedValue(items);

      const result = await service.getCart(userId);

      expect(result.message).toBe('Lấy giỏ hàng thành công');
      expect(result.data.count).toBe(2);
      expect(result.data.totalPrice).toBe(300000);
      expect(result.data.items).toHaveLength(2);
    });
  });
});
