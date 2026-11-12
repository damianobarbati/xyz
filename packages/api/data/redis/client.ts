import { Redis } from 'ioredis';
import { ENV } from '#api/env.ts';

export const redis = new Redis(ENV.REDIS_URI);

if (ENV.APP_ENV === 'local' && ENV.NODE_ENV !== 'test') await redis.set('connection-check', 'ok', 'EX', 10);
