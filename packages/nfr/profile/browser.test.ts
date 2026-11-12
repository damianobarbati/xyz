import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { monitorBrowser } from './browser.ts';
import type { Recording } from './report.ts';

test('captures each page before page, context, and browser closure without changing its actions', async (context) => {
  context.mock.method(Date, 'now', () => 1_794_493_825_999);
  const directory = await mkdtemp(join(tmpdir(), 'nfr-browser-'));
  const browser = await chromium.launch({ headless: true });
  const label = `Browser / fixture: ${'x'.repeat(110)}`;
  monitorBrowser({ browser, directory, label: () => label });

  try {
    const context = await browser.newContext();
    const first = await context.newPage();
    await first.goto('data:text/html,<button>First page</button>');
    await first.getByRole('button').click();
    await first.close();
    const second = await context.newPage();
    await second.goto('data:text/html,<button>Second page</button>');
    await context.close();
    const third = await browser.newPage();
    await third.goto('data:text/html,<button>Third page</button>');
    await browser.close();
    const files = await readdir(directory);
    const summaries = files.filter((name) => name.endsWith('.recording.json'));
    assert.equal(summaries.length, 3);

    for (const file of summaries) {
      const result: Recording = JSON.parse(await readFile(join(directory, file), 'utf8'));
      assert.deepEqual(result.errors, []);
      assert.equal(result.label, label);
      const slug = `browser-fixture-${'x'.repeat(84)}`;
      assert.match(result.name, new RegExp(`^${slug}_1794493825_${process.pid}-\\d+$`));
      assert.equal(file, `${result.name}.recording.json`);
      assert.equal(result.peakRssBytes, null);
      assert.deepEqual(result.profiles, [`${result.name}.heapprofile`, `${result.name}.cpuprofile`]);

      for (const name of result.profiles) {
        const profile = JSON.parse(await readFile(join(directory, name), 'utf8'));
        assert.ok(profile.nodes || profile.head);
      }
    }
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('preserves failure evidence when a profiled target disappears', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nfr-browser-failure-'));
  const browser = await chromium.launch({ headless: true });
  const close = browser.close.bind(browser);
  monitorBrowser({ browser, directory });

  try {
    await browser.newPage();
    await close();
    await browser.close();
    const files = await readdir(directory);
    const file = files.find((name) => name.endsWith('.recording.json'));
    assert.ok(file);
    const recording: Recording = JSON.parse(await readFile(join(directory, file), 'utf8'));
    assert.match(recording.name, /^page_\d+_\d+-\d+$/);
    assert.ok(recording.errors.length > 0);
    assert.deepEqual(recording.profiles, []);
  } finally {
    await close();
    await rm(directory, { recursive: true, force: true });
  }
});
