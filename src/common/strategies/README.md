# common/strategies

Thư mục này chứa các Passport strategies dùng chung cho toàn bộ hệ thống.

## Mục đích
- Định nghĩa các chiến lược xác thực (authentication strategies) như JWT, OAuth, Local, v.v.
- Giúp tái sử dụng logic xác thực giữa các module khác nhau.
- Tập trung quản lý các cấu hình xác thực.

## Cấu trúc

```
strategies/
  ├── jwt.strategy.ts          # JWT authentication strategy
  ├── local.strategy.ts        # Local username/password strategy
  └── README.md
```

## Các Strategy có sẵn

### JWT Strategy
Dùng để xác thực các request dựa trên JWT Bearer token.

**Cách sử dụng:**
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('protected-route')
getProtectedData(@Request() req) {
  return {
    message: 'Data của user: ' + req.user.email,
    user: req.user,
  };
}
```

**Token format:**
```
Authorization: Bearer <access_token>
```

### Local Strategy (Optional)
Dùng để xác thực username và password.

## Hướng dẫn thêm Strategy mới

1. Tạo file `<strategy-name>.strategy.ts` trong thư mục này
2. Extends `PassportStrategy(Strategy)` từ `@nestjs/passport`
3. Implement method `validate()` để xác thực logic
4. Import strategy vào module cần dùng

**Ví dụ tạo Local Strategy:**
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

## Environment Variables cần thiết

```env
ACCESSTOKEN_SECRET_KEY=your_jwt_secret
ACCESSTOKEN_EXPIRE=300
REFRESHTOKEN_SECRET_KEY=your_refresh_secret
REFRESHTOKEN_EXPIRE=8640000
```

## Best Practices

- ✅ Luôn validate user thực tế từ database
- ✅ Check trạng thái user (deleted, banned, v.v.)
- ✅ Throw `UnauthorizedException` khi xác thực thất bại
- ✅ Reuse strategies qua guards trong toàn ứng dụng
- ❌ Đừng hardcode secret keys trong code
- ❌ Đừng log sensitive data (password, tokens)
