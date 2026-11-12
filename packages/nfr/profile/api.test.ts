import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import '../env.ts';
import { closeApi, request } from './api.ts';

test('profiles the isolated API process and closes its owned server', { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nfr-api-'));

  const child = fork(fileURLToPath(new URL('./api-process.ts', import.meta.url)), [directory], {
    env: { ...process.env, NODE_ENV: 'production' },
    execArgv: ['--import=amaro/transform'],
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });

  try {
    const ready = await request({ child });
    assert.equal(ready.pid, child.pid);
    assert.notEqual(ready.pid, process.pid);
    await request({ child, command: 'start' });
    const response = await fetch(`${ready.url}/health`);
    assert.equal(response.status, 200);
    await response.text();
    const result = await request({ child, command: 'stop' });
    assert.deepEqual(result.recording.errors, []);
    assert.equal(result.recording.samples.at(-1).rssBytes > 0, true);
    const cpu = JSON.parse(await readFile(join(directory, 'api.cpuprofile'), 'utf8'));
    assert.ok(cpu.nodes.length > 0 && cpu.endTime >= cpu.startTime);
  } finally {
    await closeApi({ child });
    await rm(directory, { recursive: true, force: true });
  }

  assert.ok(child.pid);
  assert.throws(() => process.kill(child.pid as number, 0), { code: 'ESRCH' });
});

test('rejects IPC requests after the API exits', async () => {
  const child = fork(fileURLToPath(new URL('./api-process.ts', import.meta.url)), ['/unused'], {
    env: { ...process.env, NODE_ENV: 'production' },
    execArgv: ['--import=amaro/transform'],
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });

  try {
    await request({ child });
  } finally {
    await closeApi({ child });
  }

  await assert.rejects(request({ child, command: 'start' }), /has exited/);
});

test('preserves native profiles when an active recording is interrupted', { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nfr-api-interrupted-'));

  const child = fork(fileURLToPath(new URL('./api-process.ts', import.meta.url)), [directory], {
    env: { ...process.env, NODE_ENV: 'production' },
    execArgv: ['--import=amaro/transform'],
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });

  try {
    await request({ child });
    await request({ child, command: 'start' });
    const controller = new AbortController();
    controller.abort(new Error('Interrupted fixture'));
    await assert.rejects(request({ child, command: 'stop', signal: controller.signal }), /Interrupted fixture/);
    const exited = once(child, 'exit');
    child.kill('SIGINT');
    await exited;
    const heap = JSON.parse(await readFile(join(directory, 'api.heapprofile'), 'utf8'));
    assert.ok(heap.head);
  } finally {
    await closeApi({ child });
    await rm(directory, { recursive: true, force: true });
  }
});
