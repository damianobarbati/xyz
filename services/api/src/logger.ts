import { AsyncLocalStorage } from 'node:async_hooks';
import debug from 'debug';
import { getUserFromAsyncStorageOrNull } from '#api/helpers.ts';

const asyncLocalStorage = new AsyncLocalStorage<string>();

export const setTransactionId = (trxId: string) => asyncLocalStorage.enterWith(trxId);

export const getTransactionId = () => asyncLocalStorage.getStore() ?? null;

export default (namespace: string) => {
  const log = debug(namespace);

  return ((...args: any[]) => {
    const user = getUserFromAsyncStorageOrNull();
    const txn = getTransactionId();

    if (user) args.unshift(`[uid:${user.id.slice(0, 8)}]`);
    if (txn) args.unshift(`[txn:${txn}]`);

    log(...args);
  }) as typeof log & { enabled: boolean };
};
