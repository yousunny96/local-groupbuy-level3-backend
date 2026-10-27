import { Module } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { DbService } from './db.service.js';
import { HealthController } from './health.controller.js';
import { ShopController } from './shop.controller.js';
import { ShopService } from './shop.service.js';

@Module({
  controllers: [HealthController, AuthController, ShopController],
  providers: [DbService, AuthService, AuthGuard, AiService, ShopService],
})
export class AppModule {}
