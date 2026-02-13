import fsp from 'node:fs/promises';
import type { Knex } from 'knex';
import Cache from '#api/database/cache.ts';

const views = await fsp.readFile('../database/views.sql', 'utf-8');

export const up = async (database: Knex) => {
  /**
   * Your changes to the database here.
   */

  // refresh views
  await database.raw(views);
  // clear cache
  await Cache.cache.flushall();
};

export const down = Function.prototype;
