import type { Knex } from "knex";
import ENV from "#api/env.ts";
import logger from "#api/logger.ts";

const debugFn = logger("xyz:db");

const config: Knex.Config = {
  client: "pg",
  connection: {
    connectionString: ENV.DB_URI,
    ssl: ENV.APP_ENV === "local" ? undefined : { rejectUnauthorized: false },
  },
  pool: {
    // max = max db connections / number of replicas
    min: 1, // destroy all idle connections, ref: https://github.com/knex/knex/issues/4525#issuecomment-862394537
    max: 90, // use max connections divided by number of replicas to not saturate connections among all replicas
    acquireTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
    propagateCreateError: false,
  },
  acquireConnectionTimeout: 5_000,
  debug: ENV.DEBUG.includes("db"),
  asyncStackTraces: true, // ref: https://knexjs.org/guide/#asyncstacktraces
  log: {
    debug: ({ sql, bindings }) => {
      if (!sql || sql.includes("no-log")) return;
      if (debugFn.enabled) console.log(`[QUERY] ${sql}`, bindings);
      else debugFn(`[QUERY] ${sql}`, bindings);
    },
  },
  migrations: {
    stub: "./migration.stub.ts",
    tableName: "knex_migrations",
    directory: "./migrations",
    loadExtensions: [".ts"],
  },
  seeds: {
    directory: "./seeds",
    loadExtensions: [".ts"],
  },
};

export default config;
