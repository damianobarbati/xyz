import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import z from 'zod';

const envFile = new URL('../../../.env', import.meta.url);

if (existsSync(envFile)) loadEnvFile(envFile);

const envSchema = z.object({
  NODE_ENV: z.enum(['test', 'development', 'production']),
  APP_ENV: z.enum(['local', 'production']),
  TZ: z.string().min(1),
  DEBUG: z.string().default(''),
  PG_URI: z.string().min(1),
  REDIS_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const ENV = envSchema.parse(process.env);
