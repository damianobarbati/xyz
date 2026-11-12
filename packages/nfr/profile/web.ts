import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { type Browser, type BrowserServer, chromium } from 'playwright';
import '../env.ts';
import { createReport, type Recording, saveReport } from './report.ts';
import { interruption, runTests } from './tests.ts';

export const profileWeb = async () => {
  const directory = fileURLToPath(new URL('../../../.report-nfr-profile/web/', import.meta.url));
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });

  const report = createReport({
    target: 'web',
    scope: 'Isolated Chromium process CPU; application page V8 profiles and heap. Browser RSS unavailable.',
  });

  const { signal, dispose } = interruption();
  let server: BrowserServer | undefined;
  let browser: Browser | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let pending: Promise<void> | undefined;
  const processCpuSamples: { elapsedMs: number; cpuMs: number }[] = [];
  const previousCpu = new Map<number, number>();
  let cpuMs = 0;
  let started = performance.now();
  let durationMs = 0;

  try {
    server = await chromium.launchServer({
      headless: true,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
    });
    browser = await chromium.connect(server.wsEndpoint());
    report.environment.chromium = browser.version();
    const session = await browser.newBrowserCDPSession();
    const initial = await session.send('SystemInfo.getProcessInfo');
    started = performance.now();

    for (const process of initial.processInfo) previousCpu.set(process.id, process.cpuTime);

    const sample = async () => {
      try {
        const result = await session.send('SystemInfo.getProcessInfo');

        for (const process of result.processInfo) {
          cpuMs += Math.max(0, process.cpuTime - (previousCpu.get(process.id) ?? 0)) * 1000;
          previousCpu.set(process.id, process.cpuTime);
        }

        processCpuSamples.push({ elapsedMs: performance.now() - started, cpuMs });
      } catch (error) {
        report.errors.push(`Browser process CPU: ${String(error)}`);
      }
    };

    timer = setInterval(async () => {
      if (pending) return;
      pending = sample();
      await pending;
      pending = undefined;
    }, 250);
    await runTests({
      project: 'e2e',
      report,
      signal,
      env: { E2E_HEADED: '0' },
      provide: { profile: { endpoint: server.wsEndpoint(), directory } },
    });
    clearInterval(timer);
    await pending;
    await sample();
    durationMs = performance.now() - started;
    report.status = report.errors.length ? 'failed' : 'completed';
  } catch (error) {
    report.status = signal.aborted ? 'interrupted' : 'failed';
    report.errors.push(String(error));
  } finally {
    clearInterval(timer);
    await pending;

    try {
      if (browser) await browser.close();
    } catch (error) {
      report.errors.push(`Close browser connection: ${String(error)}`);
    } finally {
      try {
        if (server) await server.close();
      } catch (error) {
        report.errors.push(`Close Chromium: ${String(error)}`);
      } finally {
        dispose();
      }
    }

    for (const file of await readdir(directory)) {
      if (!file.endsWith('.recording.json')) continue;
      const recording: Recording = JSON.parse(await readFile(`${directory}/${file}`, 'utf8'));
      report.recordings.push(recording);
      await rm(`${directory}/${file}`);
    }

    if (!report.recordings.length) report.errors.push('No application page profiles were collected.');

    if (!durationMs) durationMs = performance.now() - started;
    report.processCpu = {
      scope: 'Chromium process CPU; exited process CPU between samples can be missed; RSS unavailable',
      durationMs,
      cpuMs,
      averageCpuPercent: durationMs > 0 ? (cpuMs / durationMs) * 100 : 0,
      samples: processCpuSamples,
    };
    await saveReport({ directory, report });
  }

  return report;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await profileWeb();
