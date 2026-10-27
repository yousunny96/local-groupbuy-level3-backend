import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, type AuthUser, type Role } from './auth.service.js';

/** 이 역할만 들어올 수 있다. 붙이지 않으면 로그인한 사람이면 누구나 */
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

/** 요청한 사람(로그인한 사용자)을 꺼내 쓴다 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as AuthUser;
});

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const user = token ? await this.auth.userFromToken(token) : null;
    if (!user) throw new UnauthorizedException({ message: '로그인이 필요해요. 다시 로그인해 주세요.' });

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>('roles', [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException({ message: '관리자만 할 수 있는 일이에요.' });
    }
    req.user = user;
    return true;
  }
}
