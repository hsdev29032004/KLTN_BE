import { Module } from '@nestjs/common';
import { CacheModule } from '@/infras/cache/cache.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '@/common/strategies/jwt.strategy';
import { MailModule } from '@/infras/mail/mail.module';

@Module({
  imports: [
    PassportModule,
    CacheModule,
    MailModule,
    JwtModule.register({
      secret: process.env.ACCESSTOKEN_SECRET_KEY || 'default_secret',
      signOptions: {
        expiresIn: parseInt(process.env.ACCESSTOKEN_EXPIRE || '300'),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
