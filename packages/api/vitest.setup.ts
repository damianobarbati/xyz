import { afterAll, aroundEach } from 'vitest';

const { default: config } = await import('#data/postgres/config.ts');

config.pool = { min: 1, max: 1 };

const { pg } = await import('#data/postgres/client.ts');

const { httpLogger } = await import('#api/middleware/logRequest.ts');

httpLogger.level = 'silent';

aroundEach(async (runTest) => {
  await pg.raw('BEGIN');

  try {
    await runTest();
  } finally {
    await pg.raw('ROLLBACK');
  }
});

afterAll(async () => {
  await pg.destroy();
});
