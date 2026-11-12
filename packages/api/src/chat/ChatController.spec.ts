import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import AuthService from '../auth/AuthService.ts';
import { app } from '../index.ts';
import ChatController from './ChatController.ts';

describe('POST /chat/send', () => {
  it('works', async () => {
    const account = {
      name: 'Alice',
      email: `${randomBytes(5).toString('hex')}@example.com`,
      password: 'test-password',
    };

    const user = await AuthService.register(account);
    const { token } = await AuthService.login({ email: account.email, password: account.password });

    const response = await app.request('/chat/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '  Hello\nroom  ', user: { name: 'Impostor' } }),
    });

    expect({ status: response.status, body: await response.json() }).toEqual({
      status: 200,
      body: {
        id: expect.any(String),
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        text: 'Hello\nroom',
        user: { id: user.id, name: 'Alice', color: expect.any(String) },
      },
    });
  });

  it('works with stable, distinct colors per user', async () => {
    const first = { name: 'Alice', email: `${randomBytes(5).toString('hex')}@example.com`, password: 'test-password' };
    const second = { name: 'Bob', email: `${randomBytes(5).toString('hex')}@example.com`, password: 'test-password' };
    await AuthService.register(first);
    await AuthService.register(second);
    const firstLogin = await AuthService.login({ email: first.email, password: first.password });
    const secondLogin = await AuthService.login({ email: second.email, password: second.password });
    const headers = { Authorization: `Bearer ${firstLogin.token}`, 'Content-Type': 'application/json' };

    const firstResponse = await app.request('/chat/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: 'Hello' }),
    });

    const secondResponse = await app.request('/chat/send', {
      method: 'POST',
      headers: { ...headers, Authorization: `Bearer ${secondLogin.token}` },
      body: JSON.stringify({ text: 'Hi Alice' }),
    });

    const repeatResponse = await app.request('/chat/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: 'Again' }),
    });

    const firstMessage = await firstResponse.json();
    const secondMessage = await secondResponse.json();
    const repeatMessage = await repeatResponse.json();
    expect(secondMessage.user.color).not.toEqual(firstMessage.user.color);
    expect(repeatMessage.user.color).toEqual(firstMessage.user.color);
  });

  it('fails with 401 without authentication', async () => {
    const response = await app.request('/chat/send', { method: 'POST' });
    expect({ status: response.status, body: await response.json() }).toMatchObject({
      status: 401,
      body: { code: 'INVALID_TOKEN' },
    });
  });

  it('fails with INVALID_TOKEN without a user context', async () => {
    await expect(ChatController.send({ text: 'Hello' })).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it.each([
    { reason: 'malformed JSON', body: '{' },
    { reason: 'missing text', body: '{}' },
    { reason: 'blank text', body: JSON.stringify({ text: '   ' }) },
    { reason: 'text longer than 2000 characters', body: JSON.stringify({ text: 'x'.repeat(2001) }) },
  ])('fails with 400 for $reason', async ({ body }) => {
    const account = {
      name: 'Alice',
      email: `${randomBytes(5).toString('hex')}@example.com`,
      password: 'test-password',
    };

    await AuthService.register(account);
    const { token } = await AuthService.login({ email: account.email, password: account.password });

    const response = await app.request('/chat/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
    });

    expect({ status: response.status, body: await response.json() }).toMatchObject({
      status: 400,
      body: { code: 'VALIDATION_ERROR' },
    });
  });
});

describe('GET /chat/listen', () => {
  it('works without authentication', async () => {
    const response = await app.request('/chat/listen');

    if (!response.body) throw new Error('Missing SSE body');

    const reader = response.body.getReader();

    try {
      const event = await reader.read();
      expect({
        status: response.status,
        contentType: response.headers.get('Content-Type'),
        event: new TextDecoder().decode(event.value),
      }).toEqual({
        status: 200,
        contentType: 'text/event-stream',
        event: 'event: ready\ndata: {}\n\n',
      });
    } finally {
      await reader.cancel();
    }
  });

  it('works with live broadcasts to all listeners', async () => {
    const account = {
      name: 'Alice',
      email: `${randomBytes(5).toString('hex')}@example.com`,
      password: 'test-password',
    };

    await AuthService.register(account);
    const { token } = await AuthService.login({ email: account.email, password: account.password });
    const firstResponse = await app.request('/chat/listen');
    const secondResponse = await app.request('/chat/listen');

    if (!firstResponse.body || !secondResponse.body) throw new Error('Missing SSE body');

    const firstReader = firstResponse.body.getReader();
    const secondReader = secondResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      await firstReader.read();
      await secondReader.read();

      const response = await app.request('/chat/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello room' }),
      });

      const message = await response.json();
      const firstEvent = await firstReader.read();
      const secondEvent = await secondReader.read();
      expect([decoder.decode(firstEvent.value), decoder.decode(secondEvent.value)]).toEqual([
        `data: ${JSON.stringify(message)}\n\n`,
        `data: ${JSON.stringify(message)}\n\n`,
      ]);
      await firstReader.cancel();

      const reply = await app.request('/chat/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Still listening' }),
      });

      const replyMessage = await reply.json();
      const event = await secondReader.read();
      expect(decoder.decode(event.value)).toEqual(`data: ${JSON.stringify(replyMessage)}\n\n`);
    } finally {
      await firstReader.cancel();
      await secondReader.cancel();
    }
  });

  it('works without replaying earlier messages', async () => {
    const account = {
      name: 'Alice',
      email: `${randomBytes(5).toString('hex')}@example.com`,
      password: 'test-password',
    };

    await AuthService.register(account);
    const { token } = await AuthService.login({ email: account.email, password: account.password });
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    await app.request('/chat/send', { method: 'POST', headers, body: JSON.stringify({ text: 'Before listening' }) });
    const response = await app.request('/chat/listen');

    if (!response.body) throw new Error('Missing SSE body');

    const reader = response.body.getReader();

    try {
      await reader.read();

      const sent = await app.request('/chat/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: 'After listening' }),
      });

      const message = await sent.json();
      const event = await reader.read();
      expect(new TextDecoder().decode(event.value)).toEqual(`data: ${JSON.stringify(message)}\n\n`);
    } finally {
      await reader.cancel();
    }
  });
});
