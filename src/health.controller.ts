import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DbService } from './db.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DbService) {}

  @Get()
  async check() {
    try {
      await this.db.pool.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'disconnected', message: 'DB 연결에 실패했어요.' });
    }
  }
}
