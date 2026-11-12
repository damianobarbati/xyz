import { FetchError, ofetch } from 'ofetch';
import {
  type AuthLoginRequest,
  AuthLoginRequestSchema,
  type AuthLoginResponse,
  AuthLoginResponseSchema,
  type AuthMeRequest,
  AuthMeRequestSchema,
  type AuthMeResponse,
  AuthMeResponseSchema,
  type AuthRegisterRequest,
  AuthRegisterRequestSchema,
  type AuthRegisterResponse,
  AuthRegisterResponseSchema,
} from 'types/Auth.ts';
import { ChatMessageSchema, type ChatSendRequest, ChatSendRequestSchema } from 'types/Chat.ts';
import { ENV } from './env.ts';

export const TOKEN_KEY = 'token';

export const api = ofetch.create({
  baseURL: ENV.API_URL,
  retry: 0,
  onRequest({ options }) {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) options.headers.set('Authorization', `Bearer ${token}`);
  },
});

export const login = async (url: string, { arg }: { arg: AuthLoginRequest }): Promise<AuthLoginResponse> => {
  const body = AuthLoginRequestSchema.parse(arg);
  const response = await api<unknown>(url, { method: 'POST', body });
  const result = AuthLoginResponseSchema.parse(response);

  return result;
};

export const registerUser = async (
  url: string,
  { arg }: { arg: AuthRegisterRequest },
): Promise<AuthRegisterResponse> => {
  const body = AuthRegisterRequestSchema.parse(arg);
  const response = await api<unknown>(url, { method: 'POST', body });
  const result = AuthRegisterResponseSchema.parse(response);

  return result;
};

export type SessionKey = [string, AuthMeRequest];

export const getCurrentUser = async ([url, params]: SessionKey): Promise<AuthMeResponse> => {
  AuthMeRequestSchema.parse(params);
  const response = await api<unknown>(url);
  const result = AuthMeResponseSchema.parse(response);

  return result;
};

export const isUnauthorized = (error: unknown) => {
  const result = error instanceof FetchError && error.status === 401;

  return result;
};

export const sendMessage = async (url: string, { arg }: { arg: ChatSendRequest }) => {
  const body = ChatSendRequestSchema.parse(arg);
  const response = await api<unknown>(url, { method: 'POST', body });
  const result = ChatMessageSchema.parse(response);

  return result;
};
