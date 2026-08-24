import { createMiddleware } from "hono/factory";
import { asyncLocalStorage, generateTxID } from "#api/logger.ts";

export const transaction = () =>
  createMiddleware(async (c, next) => {
    const trxId = generateTxID();
    c.header("x-transaction-id", trxId);
    await asyncLocalStorage.run(trxId, async () => await next());
  });
