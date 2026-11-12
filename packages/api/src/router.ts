import { Hono } from 'hono';
import { openapiRegistry, registerRoute } from 'nano-fw/docs/index.ts';
import {
  AuthLoginRequestSchema,
  AuthLoginResponseSchema,
  AuthMeRequestSchema,
  AuthMeResponseSchema,
  AuthRegisterRequestSchema,
  AuthRegisterResponseSchema,
} from 'types/Auth.ts';
import { ChatMessageSchema, ChatSendRequestSchema } from 'types/Chat.ts';
import { HealthRequestSchema, HealthResponseSchema } from 'types/Health.ts';
import asyncStorage from './asyncStorage.ts';
import AuthService from './auth/AuthService.ts';
import ChatController from './chat/ChatController.ts';
import { createError } from './errors.ts';
import { authenticate } from './middleware/authenticate.ts';

export const router = new Hono();

registerRoute(router, {
  method: 'post',
  path: '/chat/send',
  requestSchema: AuthMeRequestSchema.extend(ChatSendRequestSchema.shape),
  responseSchema: ChatMessageSchema,
  meta: { section: 'Chat', description: 'Broadcast a message to the room. No message history is stored.' },
  middlewares: [authenticate],
  handler: ChatController.send,
});

openapiRegistry.registerPath({
  method: 'get',
  path: '/chat/listen',
  tags: ['Chat'],
  description:
    'Public stream of future room messages. SSE data contains a ChatMessage JSON object. The ready event confirms connection. No message history is stored or replayed after reconnecting.',
  responses: {
    200: {
      description: 'SSE stream: data: <ChatMessage JSON> followed by two newlines.',
      content: { 'text/event-stream': { schema: { type: 'string' } } },
    },
  },
});

router.get('/chat/listen', async (context) => {
  const stream = await ChatController.listen();

  const response = context.newResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });

  return response;
});

registerRoute(router, {
  method: 'get',
  path: '/health',
  requestSchema: HealthRequestSchema,
  responseSchema: HealthResponseSchema,
  meta: { section: 'Health', description: 'Check API availability.' },
  handler: () => true,
});

registerRoute(router, {
  method: 'post',
  path: '/auth/register',
  requestSchema: AuthRegisterRequestSchema,
  responseSchema: AuthRegisterResponseSchema,
  meta: {
    section: 'Auth',
    description: 'Register a user.',
  },
  handler: AuthService.register,
});

registerRoute(router, {
  method: 'post',
  path: '/auth/login',
  requestSchema: AuthLoginRequestSchema,
  responseSchema: AuthLoginResponseSchema,
  meta: {
    section: 'Auth',
    description: 'Log in and receive a token without expiration.',
  },
  handler: AuthService.login,
});

registerRoute(router, {
  method: 'get',
  path: '/auth/me',
  requestSchema: AuthMeRequestSchema,
  responseSchema: AuthMeResponseSchema,
  meta: {
    section: 'Auth',
    description: 'Get the current user.',
  },
  middlewares: [authenticate],
  handler: () => {
    const store = asyncStorage.getStore();

    if (!store?.user) throw createError('INVALID_TOKEN');

    return store.user;
  },
});
