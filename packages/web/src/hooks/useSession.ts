import React from 'react';
import useSWR from 'swr';
import type { AuthMeResponse } from 'types/Auth.ts';
import { getCurrentUser, isUnauthorized, type SessionKey, TOKEN_KEY } from '../api.ts';

export const useSession = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const key: SessionKey | null = token ? ['/auth/me', { token }] : null;

  const session = useSWR<AuthMeResponse, Error, SessionKey | null>(key, getCurrentUser, {
    shouldRetryOnError: false,
  });

  const unauthorized = isUnauthorized(session.error);

  React.useEffect(() => {
    if (unauthorized && localStorage.getItem(TOKEN_KEY) === token) {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [unauthorized, token]);

  return { ...session, token, unauthorized };
};
