import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import debug from "debug";
import { getUserFromAsyncStorageOrNull } from "#api/helpers.ts";

export const asyncLocalStorage = new AsyncLocalStorage<string>();

export const generateTxID = () => randomUUID().slice(0, 8);

export const setTransactionId = (trxId: string) => asyncLocalStorage.enterWith(trxId);

export const getTransactionId = () => asyncLocalStorage.getStore() ?? null;

export default (namespace: string) => {
  const log = debug(namespace);

  return ((...args: any[]) => {
    const txn = getTransactionId();
    const user = getUserFromAsyncStorageOrNull();

    if (txn) args.unshift(`[txn:${txn}]`);
    if (user) args.unshift(`[uid:${user.id.slice(0, 8)}]`);

    log(...args);
  }) as typeof log & { enabled: boolean };
};
