import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { app, startServer } from './index.ts';

describe('startServer', () => {
  it('serves health on a temporary port', async () => {
    const server = startServer({ port: 0 });

    try {
      if (!server.listening) await once(server, 'listening');
      const address = server.address();

      if (!address || typeof address === 'string') throw new Error('Expected TCP address');
      const response = await fetch(`http://127.0.0.1:${address.port}/health`);
      expect({ status: response.status, body: await response.json() }).toEqual({ status: 200, body: true });
    } finally {
      const closed = once(server, 'close');
      server.close();
      await closed;
    }
  });
});

describe('logRequest', () => {
  it('adds a request ID without a socket connection', async () => {
    const response = await app.request('/health');
    expect(response.headers.get('X-Request-ID')).toEqual(expect.stringMatching(/^[a-f0-9]{10}$/));
  });
});

describe('authenticate', () => {
  it.each([undefined, 'Bearer', 'Basic credentials', 'Bearer two tokens'])(
    'fails because authorization is malformed: %s',
    async (authorization) => {
      const headers = authorization ? { Authorization: authorization } : undefined;
      const response = await app.request('/auth/me', { headers });
      expect({ status: response.status, body: await response.json() }).toMatchObject({
        status: 401,
        body: { code: 'INVALID_TOKEN' },
      });
    },
  );
});
