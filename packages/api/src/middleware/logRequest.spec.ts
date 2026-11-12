import { describe, expect, it, vi } from 'vitest';
import { app } from '../index.ts';
import { httpLogger } from './logRequest.ts';

describe('logRequest', () => {
  it('prints a request as one plain text line', async () => {
    const level = httpLogger.level;
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    httpLogger.level = 'info';

    try {
      await app.request('/health');
      expect(write).toHaveBeenCalledExactlyOnceWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z IP=- TXID=[a-f0-9]{10} GET \/health 200 \d+ms\n$/),
      );
    } finally {
      httpLogger.level = level;
      write.mockRestore();
    }
  });

  it('suppresses request logs at error level and preserves error logs', async () => {
    const level = httpLogger.level;
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    httpLogger.level = 'error';

    try {
      await app.request('/health');
      expect(write).not.toHaveBeenCalled();
      httpLogger.error('Test error');
      expect(write).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z Test error\n$/));
    } finally {
      httpLogger.level = level;
      write.mockRestore();
    }
  });
});
