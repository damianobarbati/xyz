import type { MiddlewareHandler } from 'hono';
import { requestToParams } from 'nano-fw/docs/index.ts';
import asyncStorage from '#api/asyncStorage.ts';
import { createError } from '#api/errors.ts';
import AuthService from '../auth/AuthService.ts';

export const authenticate: MiddlewareHandler = async (ctx, next) => {
  const authorization = ctx.req.header('Authorization') || '';
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);

  if (!match) throw createError('INVALID_TOKEN');

  const token = match[1];
  const user = await AuthService.me({ token });
  const params = await requestToParams(ctx);
  ctx.set('auth_params', { ...params, token });
  await asyncStorage.run({ user }, next);
};
