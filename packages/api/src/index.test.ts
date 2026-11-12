import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { app } from './index.ts';

describe('Router', () => {
  describe('GET /health', () => {
    it('works', async () => {
      const response = await app.request('/health');
      const body = await response.json();
      expect({
        status: response.status,
        body,
        requestId: response.headers.get('X-Request-ID'),
      }).toEqual({
        status: 200,
        body: true,
        requestId: expect.stringMatching(/^[0-9a-f]{10}$/),
      });
    });

    it('fail with 404 for an unsupported method', async () => {
      const response = await app.request('/health', { method: 'POST' });
      expect(response.status).toEqual(404);
    });
  });

  describe('GET /', () => {
    it('works', async () => {
      const response = await app.request('/');
      const html = await response.text();
      expect({
        status: response.status,
        sidebarLogo: html.includes('const logoUrl = "/mark.svg";'),
        favicon: html.includes('const faviconUrl = "/logo.svg";') && html.includes('favicon: faviconUrl,'),
      }).toEqual({ status: 200, sidebarLogo: true, favicon: true });
    });

    it('fail with 404 for an unsupported method', async () => {
      const response = await app.request('/', { method: 'POST' });
      expect(response.status).toEqual(404);
    });
  });

  describe('GET /openapi.json', () => {
    it('works', async () => {
      const response = await app.request('/openapi.json');
      const document = await response.json();
      expect({
        status: response.status,
        paths: Object.keys(document.paths).sort(),
        parameters: document.paths['/auth/me'].get.parameters,
      }).toEqual({
        status: 200,
        paths: ['/auth/login', '/auth/me', '/auth/register', '/chat/listen', '/chat/send', '/health'],
        parameters: [
          expect.objectContaining({
            in: 'header',
            name: 'Authorization',
            required: true,
          }),
        ],
      });
    });

    it('fail with 404 for an unsupported method', async () => {
      const response = await app.request('/openapi.json', { method: 'POST' });
      expect(response.status).toEqual(404);
    });
  });

  describe('POST /auth/register', () => {
    it('works', async () => {
      const email = `${randomBytes(5).toString('hex')}@example.com`;

      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: 'Route User',
          password: 'test-password',
        }),
      });

      const body = await response.json();
      expect({ status: response.status, body }).toEqual({
        status: 200,
        body: { id: expect.any(String), email, name: 'Route User' },
      });
    });

    it('fail with 400 for invalid input', async () => {
      const response = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid' }),
      });

      const body = await response.json();
      expect({ status: response.status, code: body.code }).toEqual({
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    });
  });

  describe('POST /auth/login', () => {
    it('works', async () => {
      const input = {
        email: `${randomBytes(5).toString('hex')}@example.com`,
        name: 'Route User',
        password: 'test-password',
      };

      await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.email, password: input.password }),
      });

      const body = await response.json();
      expect({ status: response.status, body }).toEqual({
        status: 200,
        body: { token: expect.any(String) },
      });
    });

    it('fail with 401 for an unknown account', async () => {
      const response = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${randomBytes(5).toString('hex')}@example.com`,
          password: 'test-password',
        }),
      });

      const body = await response.json();
      expect({ status: response.status, code: body.code }).toEqual({
        status: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });
  });

  describe('GET /auth/me', () => {
    it('works', async () => {
      const input = {
        email: `${randomBytes(5).toString('hex')}@example.com`,
        name: 'Route User',
        password: 'test-password',
      };

      const registration = await app.request('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const user = await registration.json();

      const login = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.email, password: input.password }),
      });

      const { token } = await login.json();

      const response = await app.request('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const body = await response.json();
      expect({ status: response.status, body }).toEqual({
        status: 200,
        body: user,
      });
    });

    it('fail with 401 for an invalid token', async () => {
      const response = await app.request('/auth/me', {
        headers: { Authorization: 'Bearer invalid' },
      });

      const body = await response.json();
      expect({ status: response.status, code: body.code }).toEqual({
        status: 401,
        code: 'INVALID_TOKEN',
      });
    });
  });
});
