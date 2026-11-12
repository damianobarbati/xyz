import { type ChildProcess, fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import '../env.ts';
import { createReport, saveReport } from './report.ts';
import { interruption, runTests } from './tests.ts';

type RequestInput = { child: ChildProcess; command?: string; signal?: AbortSignal };

export const request = async ({ child, command, signal }: RequestInput) => {
  if (signal) signal.throwIfAborted();

  if (child.exitCode !== null || child.signalCode !== null) throw new Error('Profile API has exited.');
  const exited = new AbortController();
  const abort = () => exited.abort(new Error('Profile API exited unexpectedly.'));
  child.once('exit', abort);
  const signals = [exited.signal, AbortSignal.timeout(60_000)];

  if (signal) signals.push(signal);

  try {
    const response = once(child, 'message', { signal: AbortSignal.any(signals) });

    if (command) child.send(command);
    const [message] = await response;

    if (message.type === 'error') throw new Error(message.error);

    return message;
  } finally {
    child.removeListener('exit', abort);
  }
};

export const closeApi = async ({ child }: { child: ChildProcess }) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');

  if (child.connected) child.send('close');
  else child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);

  try {
    const [code, signal] = await exited;

    if (code !== 0) throw new Error(`Profile API shutdown failed (${signal ?? code}).`);
  } finally {
    clearTimeout(timer);
  }
};

export const profileApi = async () => {
  const directory = fileURLToPath(new URL('../../../.report-nfr-profile/api/', import.meta.url));
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });

  const report = createReport({
    target: 'api',
    scope: 'Dedicated API process during the existing load suite; startup excluded',
  });

  const { signal, dispose } = interruption();
  let child: ChildProcess | undefined;
  let started = false;

  try {
    child = fork(fileURLToPath(new URL('./api-process.ts', import.meta.url)), [directory], {
      cwd: fileURLToPath(new URL('../../api/', import.meta.url)),
      env: { ...process.env, NODE_ENV: 'production' },
      execArgv: ['--enable-source-maps', '--import=amaro/transform'],
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    const ready = await request({ child, signal });
    await request({ child, command: 'start', signal });
    started = true;
    await runTests({ project: 'load', report, signal, env: { API_URL: ready.url } });
    report.status = report.errors.length ? 'failed' : 'completed';
  } catch (error) {
    report.status = signal.aborted ? 'interrupted' : 'failed';
    report.errors.push(String(error));
  } finally {
    try {
      if (child && started && child.connected) {
        const result = await request({ child, command: 'stop' });
        report.recordings.push(result.recording);
      }
    } catch (error) {
      report.errors.push(`Save API profiles: ${String(error)}`);
    } finally {
      try {
        if (child) await closeApi({ child });
      } catch (error) {
        report.errors.push(`Close API: ${String(error)}`);
      } finally {
        dispose();

        try {
          if (!report.recordings.length) {
            const recording = JSON.parse(await readFile(`${directory}/api.recording.json`, 'utf8'));
            report.recordings.push(recording);
          }

          await rm(`${directory}/api.recording.json`, { force: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') report.errors.push(String(error));
        }

        await saveReport({ directory, report });
      }
    }
  }

  return report;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await profileApi();
