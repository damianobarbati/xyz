import { mkdir, rename, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import { join } from 'node:path';

export type Sample = {
  elapsedMs: number;
  cpuMs: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  rssBytes: number | null;
};

export type Recording = {
  name: string;
  label?: string;
  url?: string;
  scope: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  cpuMs: number;
  averageCpuPercent: number;
  peakHeapBytes: number;
  peakRssBytes: number | null;
  profiles: string[];
  samples: Sample[];
  errors: string[];
};

export type Report = {
  version: number;
  target: 'api' | 'web';
  status: 'completed' | 'failed' | 'interrupted';
  startedAt: string;
  endedAt?: string;
  environment: { node: string; platform: string; release: string; cpu: string; chromium?: string };
  scope: string;
  recordings: Recording[];
  workload?: { project: string; files: string[]; configuration: unknown };
  processCpu?: {
    scope: string;
    durationMs: number;
    cpuMs: number;
    averageCpuPercent: number;
    samples: { elapsedMs: number; cpuMs: number }[];
  };
  tests: { name: string; state: string; errors: string[] }[];
  errors: string[];
};

type WriteJsonInput = { directory: string; name: string; value: unknown };

export const writeJson = async ({ directory, name, value }: WriteJsonInput) => {
  await mkdir(directory, { recursive: true });
  const target = join(directory, name);
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, target);
};

type CreateReportInput = { target: Report['target']; scope: string };

export const createReport = ({ target, scope }: CreateReportInput): Report => {
  const report: Report = {
    version: 1,
    target,
    status: 'failed',
    startedAt: new Date().toISOString(),
    environment: { node: process.version, platform: platform(), release: release(), cpu: cpus()[0].model },
    scope,
    recordings: [],
    tests: [],
    errors: [],
  };

  return report;
};

type SaveReportInput = { directory: string; report: Report };

export const saveReport = async ({ directory, report }: SaveReportInput) => {
  report.endedAt = new Date().toISOString();

  if (report.errors.length || report.recordings.some((recording) => recording.errors.length)) {
    report.status = report.status === 'interrupted' ? 'interrupted' : 'failed';
  }

  await writeJson({ directory, name: 'summary.json', value: report });
  console.table(
    report.recordings.map((recording) => ({
      target: recording.label ?? recording.name,
      seconds: (recording.durationMs / 1000).toFixed(2),
      'CPU ms': recording.cpuMs.toFixed(2),
      'CPU %': recording.averageCpuPercent.toFixed(2),
      'peak heap MiB': (recording.peakHeapBytes / 1024 ** 2).toFixed(2),
      'peak RSS MiB': recording.peakRssBytes === null ? 'unavailable' : (recording.peakRssBytes / 1024 ** 2).toFixed(2),
    })),
  );

  if (report.processCpu) {
    console.log(
      `Chromium process CPU: ${report.processCpu.cpuMs.toFixed(2)} ms, ${report.processCpu.averageCpuPercent.toFixed(2)}% of one core.`,
    );
  }

  console.log(`Profile ${report.target}: ${report.status}. Reports saved to ${directory}`);

  if (report.errors.length) console.error(report.errors.join('\n'));

  if (report.status !== 'completed') process.exitCode = 1;
};
