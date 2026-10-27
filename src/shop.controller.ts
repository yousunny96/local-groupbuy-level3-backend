import { Body, Controller, Get, HttpCode, OnApplicationBootstrap, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { AuthGuard, CurrentUser, Roles } from './auth.guard.js';
import type { AuthUser } from './auth.service.js';
import { ShopService } from './shop.service.js';

@Controller()
export class ShopController implements OnApplicationBootstrap {
  constructor(
    private readonly shop: ShopService,
    private readonly ai: AiService,
  ) {}

  // 처음 켰을 때 DB가 비어 있으면 가짜 데이터(확인용 계정 포함)를 한 번 채워서 빈 화면을 막는다
  async onApplicationBootstrap() {
    try {
      await this.shop.seedIfEmpty();
    } catch {
      // DB가 아직 준비되지 않았으면 /health에서 확인할 수 있다
    }
  }

  // ---------- 누구나 (로그인 없이) ----------
  @Get('group-buys')
  list(@Query() q: Record<string, string>) {
    return this.shop.listGroupBuys(q);
  }

  @Get('group-buys/options')
  options() {
    return this.shop.groupBuyOptions();
  }

  @Get('group-buys/:id')
  one(@Param('id') id: string) {
    return this.shop.getGroupBuy(Number(id));
  }

  // ---------- 로그인한 사용자 (일반 · 관리자) ----------
  @Post('orders')
  @UseGuards(AuthGuard)
  order(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.shop.createOrder(user, body ?? {});
  }

  @Post('orders/cancel')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.shop.cancelOrder(user, body ?? {});
  }

  /** 내 신청만 보인다 */
  @Get('my/orders')
  @UseGuards(AuthGuard)
  myOrders(@CurrentUser() user: AuthUser) {
    return this.shop.listMyOrders(user.id);
  }

  // ---------- 관리자만 ----------
  @Post('group-buys')
  @UseGuards(AuthGuard)
  @Roles('admin')
  create(@Body() body: Record<string, unknown>) {
    return this.shop.createGroupBuy(body ?? {});
  }

  @Get('orders')
  @UseGuards(AuthGuard)
  @Roles('admin')
  orders(@Query() q: Record<string, string>) {
    return this.shop.listOrders(q);
  }

  @Get('stats')
  @UseGuards(AuthGuard)
  @Roles('admin')
  stats() {
    return this.shop.stats();
  }

  @Post('seed')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Roles('admin')
  seed() {
    return this.shop.seed();
  }

  @Post('admin/ai/summary')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Roles('admin')
  aiSummary() {
    return this.ai.summarize();
  }
}
