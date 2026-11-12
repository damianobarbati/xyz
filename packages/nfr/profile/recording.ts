import { performance } from 'node:perf_hooks';
import { type Recording, type Sample, writeJson } from './report.ts';

type StartRecordingInput = {
  name: string;
  scope: string;
  directory: string;
  send: (method: string, params?: Record<string, unknown>) => Promise<any>;
  read: () => Promise<Omit<Sample, 'elapsedMs'>>;
};

export const startRecording = async ({ name, scope, directory, send, read }: StartRecordingInput) => {
  await send('Profiler.enable');
  await send('HeapProfiler.enable');
  await send('HeapProfiler.startSampling', { samplingInterval: 32768 });
  await send('Profiler.start');
  const started = performance.now();

  const recording: Recording = {
    name,
    scope,
    startedAt: new Date().toISOString(),
    endedAt: '',
    durationMs: 0,
    cpuMs: 0,
    averageCpuPercent: 0,
    peakHeapBytes: 0,
    peakRssBytes: null,
    profiles: [],
    samples: [],
    errors: [],
  };

  let pending: Promise<void> | undefined;

  const sample = async () => {
    try {
      const values = await read();
      recording.samples.push({ elapsedMs: performance.now() - started, ...values });
    } catch (error) {
      recording.errors.push(`sample: ${String(error)}`);
    }
  };

  await sample();

  const timer = setInterval(async () => {
    if (pending) return;
    pending = sample();
    await pending;
    pending = undefined;
  }, 250);

  let stopped = false;

  const stop = async () => {
    if (stopped) return recording;
    stopped = true;
    clearInterval(timer);
    await pending;
    await sample();
    recording.durationMs = performance.now() - started;
    recording.endedAt = new Date().toISOString();

    const profiles: { file: string; profile: unknown }[] = [];

    for (const [method, extension] of [
      ['HeapProfiler.stopSampling', 'heapprofile'],
      ['Profiler.stop', 'cpuprofile'],
    ]) {
      try {
        const { profile } = await send(method);
        const file = `${name}.${extension}`;
        profiles.push({ file, profile });
      } catch (error) {
        recording.errors.push(`${method}: ${String(error)}`);
      }
    }

    for (const { file, profile } of profiles) {
      try {
        await writeJson({ directory, name: file, value: profile });
        recording.profiles.push(file);
      } catch (error) {
        recording.errors.push(`${file}: ${String(error)}`);
      }
    }

    const last = recording.samples.at(-1);
    recording.cpuMs = last ? last.cpuMs : 0;
    recording.averageCpuPercent = recording.durationMs > 0 ? (recording.cpuMs / recording.durationMs) * 100 : 0;

    for (const value of recording.samples) {
      recording.peakHeapBytes = Math.max(recording.peakHeapBytes, value.heapUsedBytes);

      if (value.rssBytes !== null) recording.peakRssBytes = Math.max(recording.peakRssBytes ?? 0, value.rssBytes);
    }

    return recording;
  };

  return { stop };
};
