import knex from 'knex';
import pgDriver from 'pg';
import { ENV } from '#api/env.ts';
import config from './config.ts';

pgDriver.types.setTypeParser(pgDriver.types.builtins.TEXT, String);

pgDriver.types.setTypeParser(pgDriver.types.builtins.NUMERIC, Number);

pgDriver.types.setTypeParser(pgDriver.types.builtins.INT2, Number);

pgDriver.types.setTypeParser(pgDriver.types.builtins.INT4, Number);

pgDriver.types.setTypeParser(pgDriver.types.builtins.INT8, Number);

pgDriver.types.setTypeParser(pgDriver.types.builtins.FLOAT4, Number);

pgDriver.types.setTypeParser(pgDriver.types.builtins.FLOAT8, Number);

pgDriver.types.setTypeParser(pgDriver.types.builtins.TIMESTAMP, String);

pgDriver.types.setTypeParser(pgDriver.types.builtins.TIMESTAMPTZ, String);

export const pg = knex(config);

// quick test running only in the local environment, we have k8s probes in remote environments
if (ENV.APP_ENV === 'local' && ENV.NODE_ENV !== 'test') await pg.raw('SELECT 1 /* no-log */');
