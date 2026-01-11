import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '@/common/strategies/jwt.strategy';
import { PrismaService } from '@/infras/prisma/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.ACCESSTOKEN_SECRET_KEY || 'default_secret',
      signOptions: { expiresIn: parseInt(process.env.ACCESSTOKEN_EXPIRE || '300') },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService],
  exports: [AuthService, PrismaService],
})
export class AuthModule {}
