import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/infras/prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

const mockJwt = { sign: jest.fn(), verify: jest.fn() };
const mockPrisma = {
  user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  role: { findFirst: jest.fn() },
  ban:  { findUnique: jest.fn() },
};

const baseUser = () => ({
  id: 'u1', email: 'test@gmail.com', password: 'hashed', fullName: 'Test',
  avatar: null, bankNumber: null, bankName: null, roleId: 'r1',
  banId: null, isDeleted: false, timeBan: null, timeUnBan: null,
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  refreshToken: 'rt', slug: 'test-u1',
  role: { id: 'r1', name: 'User', rolePermissions: [] },
  ban: null,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    process.env.ACCESSTOKEN_SECRET_KEY = 'acc-secret';
    process.env.REFRESHTOKEN_SECRET_KEY = 'ref-secret';
    process.env.ACCESSTOKEN_EXPIRE  = '300';
    process.env.REFRESHTOKEN_EXPIRE = '8640000';
    process.env.BCRYPT_SALT = '10';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService,    useValue: mockJwt    },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  // ── login() ──────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('UN_AUTH_01 – Đăng nhập thành công', async () => {
      const user = baseUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('at').mockReturnValueOnce('rt');
      mockPrisma.user.update.mockResolvedValue(user);

      const res = await service.login({ email: 'test@gmail.com', password: 'pass123' });

      expect(res.accessToken).toBe('at');
      expect(res.refreshToken).toBe('rt');
      expect(res.user).not.toHaveProperty('password');
      expect(res.user).not.toHaveProperty('refreshToken');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { refreshToken: 'rt' },
      });
    });

    it('UN_AUTH_02 – Email rỗng', async () => {
      await expect(service.login({ email: '', password: 'pass123' }))
        .rejects.toThrow(new UnauthorizedException('Email is required'));
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('UN_AUTH_03 – Password rỗng', async () => {
      await expect(service.login({ email: 'kbo@gmail.com', password: '' }))
        .rejects.toThrow(new UnauthorizedException('Password is required'));
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('UN_AUTH_04 – User không tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'ghost@gmail.com', password: 'pass123' }))
        .rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('UN_AUTH_05 – User đã bị xóa', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser(), isDeleted: true });
      await expect(service.login({ email: 'test@gmail.com', password: 'pass123' }))
        .rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('UN_AUTH_06 – Sai mật khẩu', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ email: 'test@gmail.com', password: 'mk sai' }))
        .rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('UN_AUTH_07 – User đang bị ban còn hiệu lực', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser(), banId: 'ban-1', timeUnBan: new Date(Date.now() + 60_000),
        ban: { id: 'ban-1', reason: 'vi pham' },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login({ email: 'test@gmail.com', password: 'pass123' }))
        .rejects.toThrow(new UnauthorizedException('User is banned'));
    });

    it('UN_AUTH_08 – Ban đã hết hạn', async () => {
      const user = { ...baseUser(), banId: 'ban-1', timeUnBan: new Date(Date.now() - 60_000) };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('at').mockReturnValueOnce('rt');
      mockPrisma.user.update.mockResolvedValue(user);

      const res = await service.login({ email: user.email, password: 'pass123' });
      expect(res.accessToken).toBe('at');
    });
  });

  // ── register() ───────────────────────────────────────────────────────────

  describe('register()', () => {
    it('UN_AUTH_09 – Payload null', async () => {
      await expect(service.register(null))
        .rejects.toThrow(new UnauthorizedException('Invalid register payload'));
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('UN_AUTH_10 – Email đã tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser());
      await expect(service.register({ email: 'test@gmail.com', password: 'pass123', fullName: 'T', role: 'user' }))
        .rejects.toThrow(new UnauthorizedException('Email already exists'));
    });

    it('UN_AUTH_11 – Thiếu trường bắt buộc', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.register({ email: 'kbo@gmail.com', role: 'user' }))
        .rejects.toThrow(new UnauthorizedException('Missing required fields'));
    });

    it("UN_AUTH_12 – Role 'user' không có trong DB", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findFirst.mockResolvedValue(null);
      await expect(service.register({ email: 'new@gmail.com', password: 'pass123', fullName: 'New', role: 'user' }))
        .rejects.toThrow(new UnauthorizedException('Default role not found'));
    });

    it("UN_AUTH_13 – Role 'teacher' không có trong DB", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findFirst
        .mockResolvedValueOnce({ id: 'r1', name: 'User' })
        .mockResolvedValueOnce(null);
      await expect(service.register({ email: 'teacher@gmail.com', password: 'pass123', fullName: 'T', role: 'teacher' }))
        .rejects.toThrow(new UnauthorizedException('Requested role not found'));
    });

    it('UN_AUTH_14 – Đăng ký thành công', async () => {
      const role = { id: 'r1', name: 'User', rolePermissions: [] };
      const created = { ...baseUser(), id: 'u2', email: 'new@gmail.com', fullName: 'New User', slug: 'new-user-1', role };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.role.findFirst.mockResolvedValue(role);
      mockPrisma.user.create.mockResolvedValue(created);

      const res = await service.register({ email: 'new@gmail.com', password: '123456', fullName: 'New User', role: 'user' });

      expect(res).toEqual({ id: created.id, email: created.email, fullName: created.fullName, slug: created.slug, avatar: created.avatar, role });
      expect(res).not.toHaveProperty('password');
    });
  });

  // ── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('UN_AUTH_15 – Đăng xuất thành công', async () => {
      mockPrisma.user.update.mockResolvedValue({ ...baseUser(), refreshToken: null });

      await service.logout('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });
  });

  // ── refreshToken() ────────────────────────────────────────────────────────

  describe('refreshToken()', () => {
    it('UN_AUTH_16 – Token rỗng', async () => {
      await expect(service.refreshToken(''))
        .rejects.toThrow(new UnauthorizedException('Refresh token is required'));
      expect(mockJwt.verify).not.toHaveBeenCalled();
    });

    it('UN_AUTH_17 – Token không hợp lệ', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.refreshToken('bad-token'))
        .rejects.toThrow(new UnauthorizedException('Invalid or expired refresh token'));
    });

    it('UN_AUTH_18 – Không tìm thấy user với token', async () => {
      mockJwt.verify.mockReturnValue({ id: 'u1' });
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.refreshToken('unknown-token'))
        .rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('UN_AUTH_19 – User bị ban', async () => {
      mockJwt.verify.mockReturnValue({ id: 'u1' });
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser(), banId: 'ban-1', timeUnBan: new Date(Date.now() + 60_000),
        ban: { id: 'ban-1', reason: 'Spam' },
      });
      await expect(service.refreshToken('valid-token'))
        .rejects.toThrow(new UnauthorizedException('User is banned'));
    });

    it('UN_AUTH_20 – Làm mới token thành công', async () => {
      const user = baseUser();
      mockJwt.verify.mockReturnValue({ id: user.id });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockJwt.sign.mockReturnValueOnce('new-at').mockReturnValueOnce('new-rt');
      mockPrisma.user.update.mockResolvedValue(user);

      const res = await service.refreshToken('valid-rt');

      expect(res.accessToken).toBe('new-at');
      expect(res.refreshToken).toBe('new-rt');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { refreshToken: 'new-rt' },
      });
    });
  });
});
