import z from 'zod';

const envSchema = z.object({
  API_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

let ENV: Env;

// in node we build the public/env.json file given the environment variables
if (typeof window === 'undefined') {
  const { existsSync } = await import('node:fs');
  const { loadEnvFile } = await import('node:process');
  const envPath = '../../../.env';
  const envFile = new URL(envPath, import.meta.url);

  if (existsSync(envFile)) loadEnvFile(envFile);

  ENV = envSchema.parse(process.env);
  const fsp = await import('node:fs/promises');
  const configuration = JSON.stringify(ENV, null, 2);

  if (existsSync('./public')) await fsp.writeFile('./public/env.json', configuration);

  if (existsSync('./dist')) await fsp.writeFile('./dist/env.json', configuration);
}
// in the browser we fetch it
else {
  const response = await fetch('/env.json', { cache: 'no-store' });

  if (!response.ok) throw new Error('Cannot load application configuration');
  const result = await response.json();
  ENV = envSchema.parse(result);
}

export { ENV };
