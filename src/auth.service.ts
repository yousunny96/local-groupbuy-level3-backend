import './env.js';
import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DbService, US } from './db.service.js';

export type Role = 'admin' | 'user';
export interface AuthUser {
  id: number;
  username: string;
  name: string;
  phone: string;
  role: Role;
}

const TOKEN_HOURS = 12;

function b64(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

/** 비밀번호는 원문 대신 "소금을 섞어 되돌릴 수 없게 바꾼 값"으로만 저장한다 */
export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function checkPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DbService) {}

  private secret() {
    const s = process.env.AUTH_SECRET;
    if (!s || s.length < 16) throw new Error('AUTH_SECRET 설정값이 필요해요. (16자 이상)');
    return s;
  }

  private sign(payload: string) {
    return createHmac('sha256', this.secret()).update(payload).digest('base64url');
  }

  /** 로그인 성공 시 받는 "출입증". 위조되면 서명이 맞지 않아 거절된다 */
  makeToken(userId: number) {
    const payload = b64(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_HOURS * 3600_000 }));
    return `${payload}.${this.sign(payload)}`;
  }

  async userFromToken(token: string): Promise<AuthUser | null> {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expected = this.sign(payload);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    let data: { uid?: number; exp?: number };
    try {
      data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch {
      return null;
    }
    if (!Number.isInteger(data.uid) || !data.exp || data.exp < Date.now()) return null;
    // 역할은 토큰이 아니라 DB에서 매번 확인한다 (역할이 바뀌면 바로 반영)
    const { rows } = await this.db.pool.query(
      `SELECT id, username, name, phone, role FROM ${US} WHERE id = $1`,
      [data.uid],
    );
    return (rows[0] as AuthUser | undefined) ?? null;
  }

  async login(username: string, password: string) {
    const { rows } = await this.db.pool.query(
      `SELECT id, username, name, phone, role, password_hash FROM ${US} WHERE username = $1`,
      [username.trim().toLowerCase()],
    );
    const u = rows[0];
    // 아이디가 틀렸는지 비밀번호가 틀렸는지는 알려 주지 않는다
    if (!u || !checkPassword(password, u.password_hash)) return null;
    const { password_hash: _omit, ...user } = u;
    return { token: this.makeToken(u.id), user: user as AuthUser };
  }
}
