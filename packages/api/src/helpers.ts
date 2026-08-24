import asyncStorage from "#api/asyncStorage.ts";

export const getUserFromAsyncStorage = () => asyncStorage.getStore()?.user;

export const getUserFromAsyncStorageOrNull = (): any | null => {
  try {
    return getUserFromAsyncStorage();
  } catch {
    return null;
  }
};
