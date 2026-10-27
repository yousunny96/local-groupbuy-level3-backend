import './env.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const app = await NestFactory.create(AppModule);
const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.enableCors({ origin: origins });
await app.listen(process.env.PORT ?? 4000);
