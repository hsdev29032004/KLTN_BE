import { Controller, Post, Body, Res, Get, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { User } from '@/common/decorators/user.decorator';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @PublicAPI()
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: parseInt(process.env.ACCESSTOKEN_EXPIRE || '300') * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: parseInt(process.env.REFRESHTOKEN_EXPIRE || '8640000') * 1000,
    });

    const { accessToken, refreshToken, ...rest } = result;
    return {
      message: 'Đăng nhập thành công',
      data: rest,
    };
  }

  @PublicAPI()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @SkipPermission()
  @Get('me')
  async fetchMe(@User() user: any) {
    return {
      message: 'User information retrieved successfully',
      data: user,
    };
  }

  @PublicAPI()
  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    const result = await this.authService.refreshToken(refreshToken);

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: parseInt(process.env.ACCESSTOKEN_EXPIRE || '300') * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: parseInt(process.env.REFRESHTOKEN_EXPIRE || '8640000') * 1000,
    });

    const { accessToken, refreshToken: newRefreshToken, ...rest } = result;
    return rest;
  }
}
