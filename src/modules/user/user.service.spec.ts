import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { PrismaService } from '@/infras/prisma/prisma.service';
import type { IUser } from '@/shared/types/user.type';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: any;

  const userId = 'user-1';
  const adminId = 'admin-1';

  const adminUser = (): IUser => ({
    id: adminId,
    email: 'admin@example.com',
    fullName: 'Admin',
    avatar: '',
    role: { id: 'role-admin', name: 'Admin', createdAt: '', updatedAt: '', rolePermissions: [] },
    ban: null,
    roleId: 'role-admin',
    banId: null,
    isDeleted: false,
    timeBan: null,
    availableAmount: 0,
  } as any);

  const nonAdminUser = (): IUser => ({
    ...adminUser(),
    id: 'user-2',
    role: { id: 'role-user', name: 'User', createdAt: '', updatedAt: '', rolePermissions: [] },
    roleId: 'role-user',
  });

  const baseUser = (overrides: Record<string, any> = {}) => ({
    id: userId,
    fullName: 'Test User',
    email: 'test@example.com',
    avatar: null,
    slug: 'test-user',
    introduce: null,
    password: 'hashed_old',
    isDeleted: false,
    banId: null,
    timeBan: null,
    timeUnBan: null,
    ...overrides,
  });

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ban: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    process.env.BCRYPT_SALT = '10';
    jest.clearAllMocks();
  });

  // ────────────────────────────── getPublicProfile() ──────────────────────────────

  describe('getPublicProfile()', () => {
    it('UN_USR_1 – User không tồn tại → NotFoundException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getPublicProfile('invalid'))
        .rejects.toThrow(new NotFoundException('Người dùng không tồn tại'));
    });

    it('UN_USR_2 – Lấy profile thành công → trả về top 10 courses published', async () => {
      const profile = {
        id: userId,
        fullName: 'Test User',
        avatar: null,
        slug: 'test-user',
        introduce: null,
        createdAt: new Date(),
        courses: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, name: `Course ${i}` })),
        _count: { courses: 10, reviews: 5 },
      };
      mockPrisma.user.findUnique.mockResolvedValue(profile);

      const result = await service.getPublicProfile('test-user');

      expect(result.message).toBe('Lấy thông tin profile thành công');
      expect(result.data.courses).toHaveLength(10);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'test-user', isDeleted: false } }),
      );
    });
  });

  // ────────────────────────────── updateProfile() ──────────────────────────────

  describe('updateProfile()', () => {
    it('UN_USR_3 – User không tồn tại → NotFoundException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('invalid', { fullName: 'New Name' }))
        .rejects.toThrow(new NotFoundException('Người dùng không tồn tại'));
    });

    it('UN_USR_4 – Đổi fullName → slug tự cập nhật theo generateSlug', async () => {
      const updated = { ...baseUser(), fullName: 'New Name', slug: 'new-name' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(baseUser())   // load user
        .mockResolvedValueOnce(null);        // slug conflict check → không trùng
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile(userId, { fullName: 'New Name' });

      expect(result.message).toBe('Cập nhật thông tin thành công');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: 'New Name',
            slug: 'new-name',
          }),
        }),
      );
    });

    it('UN_USR_5 – Slug mới trùng user khác → thêm timestamp suffix để unique', async () => {
      const conflictUser = { ...baseUser(), id: 'other-user', slug: 'nguyen-van-a' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(baseUser())    // load user
        .mockResolvedValueOnce(conflictUser); // slug conflict → đã tồn tại
      mockPrisma.user.update.mockResolvedValue({ ...baseUser(), slug: 'nguyen-van-a-9999' });

      await service.updateProfile(userId, { fullName: 'Nguyen Van A' });

      // Phải gọi findUnique để check slug trùng
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
      // Slug được truyền vào update phải có suffix timestamp
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/^nguyen-van-a-\d+$/),
          }),
        }),
      );
    });
  });

  // ────────────────────────────── changePassword() ──────────────────────────────

  describe('changePassword()', () => {
    it('UN_USR_6 – Mật khẩu hiện tại sai → UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(userId, { currentPassword: 'wrong', newPassword: 'new123' }),
      ).rejects.toThrow(new UnauthorizedException('Mật khẩu hiện tại không đúng'));
    });

    it('UN_USR_7 – Đổi mật khẩu thành công → hash và lưu mật khẩu mới', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.changePassword(userId, {
        currentPassword: 'old',
        newPassword: 'new123',
      });

      expect(result.message).toBe('Đổi mật khẩu thành công');
      expect(bcrypt.hash).toHaveBeenCalledWith('new123', 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { password: 'hashed_new' } }),
      );
    });

    it('UN_USR_8 – newPassword giống currentPassword → BadRequestException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser());

      await expect(
        service.changePassword(userId, { currentPassword: 'abc123', newPassword: 'abc123' }),
      ).rejects.toThrow(new BadRequestException('Mật khẩu mới không được trùng mật khẩu cũ'));
    });
  });

  // ────────────────────────────── banUser() ──────────────────────────────

  describe('banUser()', () => {
    it('UN_USR_9 – Không phải admin → ForbiddenException', async () => {
      await expect(
        service.banUser(nonAdminUser(), userId, { reason: 'spam' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('UN_USR_10 – Ban chính mình → BadRequestException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser({ id: adminId }));

      await expect(
        service.banUser(adminUser(), adminId, { reason: 'test' }),
      ).rejects.toThrow(new BadRequestException('Không thể cấm chính mình'));
    });

    it('UN_USR_11 – Ban thành công → tạo ban record, cập nhật user', async () => {
      const banRecord = { id: 'ban-1', reason: 'spam' };
      const updatedUser = { ...baseUser(), banId: 'ban-1', timeBan: new Date() };

      mockPrisma.user.findUnique.mockResolvedValue(baseUser());
      mockPrisma.ban.create.mockResolvedValue(banRecord);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.banUser(adminUser(), userId, { reason: 'spam' });

      expect(result.message).toBe('Cấm người dùng thành công');
      expect(mockPrisma.ban.create).toHaveBeenCalledWith({ data: { reason: 'spam' } });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ banId: 'ban-1' }),
        }),
      );
    });

    it('UN_USR_14 – Ban user đang đã bị ban → BadRequestException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser({ banId: 'ban-old' }));

      await expect(
        service.banUser(adminUser(), userId, { reason: 'new reason' }),
      ).rejects.toThrow(new BadRequestException('Người dùng đã bị cấm'));
    });
  });

  // ────────────────────────────── unbanUser() ──────────────────────────────

  describe('unbanUser()', () => {
    it('UN_USR_12 – User không bị ban → BadRequestException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser({ banId: null }));

      await expect(service.unbanUser(adminUser(), userId))
        .rejects.toThrow(new BadRequestException('Người dùng không bị cấm'));
    });

    it('UN_USR_13 – Bỏ ban thành công → banId=null', async () => {
      const unbannedUser = { ...baseUser(), banId: null, timeBan: null, timeUnBan: null };
      mockPrisma.user.findUnique.mockResolvedValue(baseUser({ banId: 'ban-1' }));
      mockPrisma.user.update.mockResolvedValue(unbannedUser);

      const result = await service.unbanUser(adminUser(), userId);

      expect(result.message).toBe('Bỏ cấm người dùng thành công');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { banId: null, timeBan: null, timeUnBan: null },
        }),
      );
    });
  });
});
