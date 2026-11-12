import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { Session } from 'node:inspector/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { startRecording } from './recording.ts';

test('writes native CPU and heap profiles with real process memory samples', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nfr-recording-'));
  const session = new Session();
  session.connect();
  const initial = process.cpuUsage();
  let recording: Awaited<ReturnType<typeof startRecording>> | undefined;

  try {
    recording = await startRecording({
      name: 'fixture',
      directory,
      scope: 'test process',
      send: async (method, params) => {
        const result = await session.post(method, params);

        return result;
      },
      read: async () => {
        const cpu = process.cpuUsage(initial);
        const memory = process.memoryUsage();

        const result = {
          cpuMs: (cpu.user + cpu.system) / 1000,
          heapUsedBytes: memory.heapUsed,
          heapTotalBytes: memory.heapTotal,
          rssBytes: memory.rss,
        };

        return result;
      },
    });
    const allocations = Array.from({ length: 20_000 }, (_, index) => ({ index, text: `allocation-${index}` }));
    assert.equal(allocations.length, 20_000);
    const result = await recording.stop();
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.profiles, ['fixture.heapprofile', 'fixture.cpuprofile']);
    assert.ok(result.samples.length >= 2);
    assert.ok(result.peakHeapBytes > 0 && result.peakRssBytes && result.peakRssBytes > 0);
    const cpu = JSON.parse(await readFile(join(directory, 'fixture.cpuprofile'), 'utf8'));
    const heap = JSON.parse(await readFile(join(directory, 'fixture.heapprofile'), 'utf8'));
    assert.ok(cpu.nodes.length > 0 && cpu.endTime >= cpu.startTime);
    assert.ok(heap.head.callFrame);
    assert.equal(await recording.stop(), result);
  } finally {
    if (recording) await recording.stop();
    session.disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});
