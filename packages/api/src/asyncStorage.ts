import { AsyncLocalStorage } from 'node:async_hooks';
import type { UserRow } from 'types/User.ts';

export type Store = {
  user: undefined | UserRow;
};

export const defaultStore: Store = {
  user: undefined,
};

const asyncStorage = new AsyncLocalStorage<Store>();

export default asyncStorage;
