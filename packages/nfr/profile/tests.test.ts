import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../env.ts';
import { createReport } from './report.ts';
import { runTests } from './tests.ts';

test('reports real workload failures without replacing assertions or retrying tests', { timeout: 15_000 }, async () => {
  const report = createReport({ target: 'api', scope: 'failed load suite' });
  await runTests({
    project: 'load',
    report,
    signal: new AbortController().signal,
    env: { API_URL: 'http://127.0.0.1:1' },
  });
  assert.equal(report.tests.length, 2);
  assert.deepEqual(report.tests.map((result) => result.state).sort(), ['failed', 'skipped']);
  assert.ok(report.errors.includes('load tests failed.'));
  assert.ok(report.tests.some((result) => result.errors.some((error) => error.includes('fetch failed'))));
});
