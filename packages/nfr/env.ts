import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import z from 'zod';

const envFile = new URL('../../.env', import.meta.url);

if (existsSync(envFile)) loadEnvFile(envFile);

const envSchema = z.object({
  WEB_URL: z.url().default('http://localhost:3000'),
  API_URL: z.url(),
  E2E_HEADED: z.enum(['0', '1']).default('0'),
});

export type Env = z.infer<typeof envSchema>;

export const ENV = envSchema.parse(process.env);
