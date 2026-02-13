import crypto from 'node:crypto';
import knex, { type Knex } from 'knex';

type DbUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

type TokenPayload = {
  sub: string;
  exp: number; // unix seconds
};

const base64UrlEncode = (input: string | Buffer) => Buffer.from(input).toString('base64url');

const base64UrlDecodeToString = (input: string) => Buffer.from(input, 'base64url').toString('utf8');

const timingSafeEqualString = (a: string, b: string) => {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
};

let _db: Knex | null = null;

const getDb = () => {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL env var');
  }

  _db = knex({
    client: 'pg',
    connection: connectionString,
  });

  return _db;
};

export default class AuthService {
  static async encodeToken(user: { id?: string } & Record<string, unknown>) {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (!secret) {
      throw new Error('Missing AUTH_TOKEN_SECRET env var');
    }

    const userId = user.id;
    if (!userId) {
      throw new Error('encodeToken: missing user.id');
    }

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload: TokenPayload = {
      sub: String(userId),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
    };

    const headerPart = base64UrlEncode(JSON.stringify(header));
    const payloadPart = base64UrlEncode(JSON.stringify(payload));
    const unsigned = `${headerPart}.${payloadPart}`;

    const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');

    return `${unsigned}.${signature}`;
  }

  static async decodeToken(token: string) {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (!secret) {
      throw new Error('Missing AUTH_TOKEN_SECRET env var');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    const unsigned = `${headerPart}.${payloadPart}`;

    const expectedSignature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');

    if (!timingSafeEqualString(signaturePart, expectedSignature)) {
      throw new Error('Invalid token signature');
    }

    const payloadJson = base64UrlDecodeToString(payloadPart);
    const payload = JSON.parse(payloadJson) as Partial<TokenPayload>;

    if (!payload.sub) {
      throw new Error('Invalid token payload: missing sub');
    }
    if (typeof payload.exp !== 'number') {
      throw new Error('Invalid token payload: missing exp');
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    const db = getDb();

    const user = (await db<DbUser>('users')
      .select(['id', 'email', 'name'])
      .where({ id: String(payload.sub) })
      .first()) as DbUser | undefined;

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  static async signIn(user: { id?: string } & Record<string, unknown>) {
    const token = await AuthService.encodeToken(user);
    return { token };
  }

  static async me(token: string) {
    const user = await AuthService.decodeToken(token);
    return user;
  }
}
