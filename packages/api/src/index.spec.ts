import { describe, expect, it } from 'vitest';
import { app } from './index.ts';

describe('Router', () => {
  describe('GET /healthcheck', () => {
    it('should succeed', async () => {
      const response = await app.request('/healthcheck', { method: 'GET' });
      const body = await response.json();
      expect(body).toEqual(true);
    });

    it('should fail with 404', async () => {
      const response = await app.request('/healthcheck', { method: 'POST' });
      expect(response.status).toEqual(404);
    });
  });

  describe('POST /ping', () => {
    it('should succeed', async () => {
      const payload = { hello: 'world' };

      const response = await app.request('/ping', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(response.status).toEqual(200);

      const body = await response.json();
      expect(body).toEqual(payload);
    });
  });
});
