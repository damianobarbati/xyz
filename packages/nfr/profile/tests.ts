import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import { createVitest } from 'vitest/node';
import { settings } from '../settings.ts';
import type { Report } from './report.ts';

type RunTestsInput = {
  project: 'e2e' | 'load';
  report: Report;
  signal: AbortSignal;
  env?: Record<string, string>;
  provide?: Record<string, unknown>;
};

export const runTests = async ({ project, report, signal, env, provide }: RunTestsInput) => {
  signal.throwIfAborted();
  const previousExitCode = process.exitCode;

  const vitest = await createVitest({
    root: fileURLToPath(new URL('../', import.meta.url)),
    project: [project],
    watch: false,
    reporters: [],
    env,
    provide,
  });

  const cancel = () => {
    void vitest.cancelCurrentRun('keyboard-input');
  };

  signal.addEventListener('abort', cancel, { once: true });

  try {
    signal.throwIfAborted();
    const result = await vitest.start();
    report.workload = {
      project,
      files: result.testModules.map((module) => module.moduleId),
      configuration: project === 'load' ? settings.load : { headless: true },
    };

    for (const module of result.testModules) {
      for (const test of module.children.allTests()) {
        const outcome = test.result();
        report.tests.push({
          name: test.fullName,
          state: outcome.state,
          errors: (outcome.errors ?? []).map((error) => inspect(error)),
        });
      }

      for (const error of module.errors()) report.errors.push(inspect(error));
    }

    report.errors.push(...result.unhandledErrors.map((error) => inspect(error)));

    if (!report.tests.length) report.errors.push(`No ${project} tests executed.`);

    if (report.tests.some((test) => test.state === 'failed')) report.errors.push(`${project} tests failed.`);
    signal.throwIfAborted();
  } finally {
    signal.removeEventListener('abort', cancel);

    try {
      await vitest.close();
    } finally {
      process.exitCode = previousExitCode;
    }
  }
};

export const interruption = () => {
  const controller = new AbortController();
  const abort = () => controller.abort(new Error('Profile interrupted.'));
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);

  const dispose = () => {
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
  };

  return { signal: controller.signal, dispose };
};
