import { BadRequestException, Body, Controller, Get, HttpCode, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from './auth.guard.js';
import { AuthService, type AuthUser } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: Record<string, unknown>) {
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const errors: Record<string, string> = {};
    if (!username) errors.username = '아이디를 입력해 주세요.';
    if (!password) errors.password = '비밀번호를 입력해 주세요.';
    if (Object.keys(errors).length) throw new BadRequestException({ message: '입력한 내용을 다시 확인해 주세요.', errors });

    const result = await this.auth.login(username, password);
    if (!result) throw new UnauthorizedException({ message: '아이디나 비밀번호가 맞지 않아요.' });
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
