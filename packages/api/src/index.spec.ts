import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { app } from './index.ts';

describe('Router', () => {
  describe('GET /healthcheck', () => {
    it('should succeed', async () => {
      const response = await app.request('/healthcheck', { method: 'GET' });
      const body = await response.json();
      assert.deepEqual(body, true);
    });

    it('should fail with 404', async () => {
      const response = await app.request('/healthcheck', { method: 'POST' });
      assert.equal(response.status, 404);
    });
  });

  describe('POST /ping', () => {
    it('should succeed', async () => {
      const payload = { hello: 'world' };

      const response = await app.request('/ping', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      assert.equal(response.status, 200);

      const body = await response.json();
      assert.deepEqual(body, payload);
    });
  });
});
