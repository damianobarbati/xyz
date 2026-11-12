import debug from 'debug';
import type { Knex } from 'knex';
import { ENV } from '#api/env.ts';

const debugFn = debug('xyz:db');

const config: Knex.Config = {
  client: 'pg',
  connection: { connectionString: ENV.PG_URI },
  asyncStackTraces: true, // ref: https://knexjs.org/guide/#asyncstacktraces
  log: {
    debug: ({ sql, bindings }) => {
      if (!debugFn.enabled) return;
      console.log(`[QUERY] ${sql}`, bindings);
    },
  },
  migrations: {
    stub: './migration.stub.ts',
    tableName: 'knex_migrations',
    directory: './migrations',
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: './seeds',
    loadExtensions: ['.ts'],
  },
};

export default config;
