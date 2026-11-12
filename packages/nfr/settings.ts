import { readFileSync } from 'node:fs';
import z from 'zod';

const loadBudgetSchema = z.object({
  endpoint: z.string().startsWith('/'),
  minRequestsPerSecond: z.number().positive(),
  maxP99Ms: z.number().nonnegative(),
});

export const settingsSchema = z.object({
  lighthouse: z.object({
    options: z.object({ port: z.number().int().min(1024).max(65535), skipAudits: z.array(z.string()) }),
    categories: z.array(z.string()).nonempty(),
    minScore: z.number().min(0).max(1),
    maxJavaScriptBytes: z.number().int().nonnegative(),
  }),
  load: z.object({ register: loadBudgetSchema, chat: loadBudgetSchema }),
});

const readSettings = () => {
  try {
    const text = readFileSync(new URL('./settings.json', import.meta.url), 'utf8');
    const config = JSON.parse(text);
    const validated = settingsSchema.parse(config);

    return validated;
  } catch (error) {
    throw new Error('Cannot load settings.json configuration. Restore the file from Git or fix its config.', {
      cause: error,
    });
  }
};

export const settings = readSettings();
