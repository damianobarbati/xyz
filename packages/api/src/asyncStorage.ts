import { AsyncLocalStorage } from 'node:async_hooks';
import type { User } from 'types/User.ts';

export type Store = {
  user: undefined | User;
};

const asyncStorage = new AsyncLocalStorage<Store>();

export default asyncStorage;
