import { on, once } from 'node:events';
import { Server } from 'node:http';
import { Session } from 'node:inspector/promises';
import { fileURLToPath } from 'node:url';
import { closeTestResources, startServer } from 'api/testing';
import { startRecording } from './recording.ts';
import { writeJson } from './report.ts';

const main = async () => {
  if (!process.send) throw new Error('API profiler requires IPC.');
  const send = process.send.bind(process);
  const directory = process.argv[2];
  const server = startServer({ port: 0 });

  if (!(server instanceof Server)) throw new Error('Expected HTTP server.');
  await once(server, 'listening');
  const address = server.address();

  if (!address || typeof address === 'string') throw new Error('Missing API address.');
  const session = new Session();
  session.connect();
  let recording: Awaited<ReturnType<typeof startRecording>> | undefined;
  const controller = new AbortController();
  const shutdown = () => controller.abort();
  process.once('disconnect', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  try {
    send({ type: 'ready', pid: process.pid, url: `http://127.0.0.1:${address.port}` });

    for await (const [command] of on(process, 'message', { signal: controller.signal })) {
      try {
        if (command === 'start') {
          const initial = process.cpuUsage();
          recording = await startRecording({
            name: 'api',
            scope: 'API process CPU and memory; V8 main-isolate CPU and allocations',
            directory,
            send: async (method, params) => {
              const value = await session.post(method, params);

              return value;
            },
            read: async () => {
              const cpu = process.cpuUsage(initial);
              const memory = process.memoryUsage();

              const sample = {
                cpuMs: (cpu.user + cpu.system) / 1000,
                heapUsedBytes: memory.heapUsed,
                heapTotalBytes: memory.heapTotal,
                rssBytes: memory.rss,
              };

              return sample;
            },
          });
          send({ type: 'started' });
        }

        if (command === 'stop') {
          if (!recording) throw new Error('API recording has not started.');
          const result = await recording.stop();
          send({ type: 'recording', recording: result });
        }

        if (command === 'close') break;
      } catch (error) {
        send({ type: 'error', error: String(error) });
      }
    }
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    process.removeListener('disconnect', shutdown);
    process.removeListener('SIGTERM', shutdown);
    process.removeListener('SIGINT', shutdown);

    if (recording) {
      const result = await recording.stop();
      await writeJson({ directory, name: 'api.recording.json', value: result });
    }

    session.disconnect();
    server.closeAllConnections();
    server.close();
    await closeTestResources();

    if (process.connected && process.disconnect) process.disconnect();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
