import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { sign, verify } from 'hono/jwt';
import { describe, expect, it } from 'vitest';
import { ENV } from '../env.ts';
import AuthService from './AuthService.ts';

describe('hashPassword', () => {
  it('works', async () => {
    const hash = await AuthService.hashPassword({ password: 'test-password' });
    const matches = await bcrypt.compare('test-password', hash);
    expect(matches).toEqual(true);
  });
});

describe('register', () => {
  it('works', async () => {
    const email = `${randomBytes(5).toString('hex')}@example.com`;

    const user = await AuthService.register({
      email,
      name: 'Test User',
      password: 'test-password',
    });

    expect(user).toEqual({ id: expect.any(String), email, name: 'Test User' });
  });

  it('fail because email already exists', async () => {
    const input = {
      email: `${randomBytes(5).toString('hex')}@example.com`,
      name: 'Test User',
      password: 'test-password',
    };

    await AuthService.register(input);
    await expect(AuthService.register(input)).rejects.toMatchObject({
      code: 'EMAIL_EXISTS',
    });
  });
});

describe('login', () => {
  it('works', async () => {
    const input = {
      email: `${randomBytes(5).toString('hex')}@example.com`,
      name: 'Test User',
      password: 'test-password',
    };

    const user = await AuthService.register(input);

    const { token } = await AuthService.login({
      email: input.email,
      password: input.password,
    });

    const payload = await verify(token, ENV.JWT_SECRET, 'HS256');
    expect(payload).toEqual({ sub: user.id });
  });

  it('fail because password is incorrect', async () => {
    const input = {
      email: `${randomBytes(5).toString('hex')}@example.com`,
      name: 'Test User',
      password: 'test-password',
    };

    await AuthService.register(input);
    await expect(AuthService.login({ email: input.email, password: 'wrong-password' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});

describe('me', () => {
  it('works', async () => {
    const input = {
      email: `${randomBytes(5).toString('hex')}@example.com`,
      name: 'Test User',
      password: 'test-password',
    };

    const user = await AuthService.register(input);

    const { token } = await AuthService.login({
      email: input.email,
      password: input.password,
    });

    const currentUser = await AuthService.me({ token });
    expect(currentUser).toEqual(user);
  });

  it('fail because token is invalid', async () => {
    await expect(AuthService.me({ token: 'invalid' })).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
  });
});

describe('me token subjects', () => {
  it.each([{}, { sub: 123 }])('fails because subject is not a string: %j', async (payload) => {
    const token = await sign(payload, ENV.JWT_SECRET, 'HS256');
    await expect(AuthService.me({ token })).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('fails because user does not exist', async () => {
    const token = await sign({ sub: randomUUID() }, ENV.JWT_SECRET, 'HS256');
    await expect(AuthService.me({ token })).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });
});
