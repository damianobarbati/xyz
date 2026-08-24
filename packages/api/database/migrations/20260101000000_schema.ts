/**
 * This is the first migration that sets up the initial database schema and views.
 * To consolidate future migrations, this file should be updated with new changes and then this query should be run:
 * TRUNCATE TABLE knex_migrations;
 * INSERT INTO knex_migrations (name, batch, migration_time) VALUES ('20260101000000_schema.ts', 1, NOW());
 */
import fsp from "node:fs/promises";
import type { Knex } from "knex";

const schema = await fsp.readFile("../database/schema.sql", "utf-8");
const views = await fsp.readFile("../database/views.sql", "utf-8");

export const up = async (database: Knex) => {
  await database.raw(schema);
  await database.raw(views);
};

export const down = Function.prototype;
