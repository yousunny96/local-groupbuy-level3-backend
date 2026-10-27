import './env.js';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

// Level 2와 같은 DB를 쓰되, 테이블이 섞이지 않게 Level 3 전용 공간(스키마)을 따로 쓴다
const rawSchema = process.env.DB_SCHEMA ?? 'fde_level3';
if (!/^[a-z_][a-z0-9_]*$/.test(rawSchema)) throw new Error('DB_SCHEMA 값이 올바르지 않아요.');
export const SCHEMA = rawSchema;
export const US = `${SCHEMA}.users`;
export const GB = `${SCHEMA}.group_buys`;
export const OD = `${SCHEMA}.orders`;

const SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS ${SCHEMA};
CREATE TABLE IF NOT EXISTS ${US} (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text NOT NULL,
  phone         text NOT NULL,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ${GB} (
  id             serial PRIMARY KEY,
  title          text NOT NULL,
  category       text NOT NULL CHECK (category IN ('과일','채소','곡물','기타')),
  origin         text NOT NULL,
  price_per_box  integer NOT NULL CHECK (price_per_box > 0),
  total_boxes    integer NOT NULL CHECK (total_boxes >= 1),
  max_per_person integer NOT NULL DEFAULT 3 CHECK (max_per_person >= 1),
  deadline       timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ${OD} (
  id            serial PRIMARY KEY,
  order_code    text NOT NULL UNIQUE,
  group_buy_id  integer NOT NULL REFERENCES ${GB}(id) ON DELETE RESTRICT,
  user_id       integer NOT NULL REFERENCES ${US}(id) ON DELETE RESTRICT,
  boxes         integer NOT NULL CHECK (boxes >= 1),
  status        text NOT NULL DEFAULT '신청' CHECK (status IN ('신청','취소')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  cancelled_at  timestamptz
);
CREATE INDEX IF NOT EXISTS orders_group_buy_idx ON ${OD}(group_buy_id);
CREATE INDEX IF NOT EXISTS orders_user_idx ON ${OD}(user_id);
`;

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('DB');
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true, // 인증서 검증을 켠 채로 접속
    max: 5,
  });

  async onModuleInit() {
    try {
      await this.pool.query(SCHEMA_SQL);
      this.log.log(`테이블 준비 완료 (${SCHEMA})`);
    } catch (e) {
      this.log.error(`DB 준비 실패: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
