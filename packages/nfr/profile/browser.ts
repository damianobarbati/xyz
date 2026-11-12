import type { Browser, BrowserContext, Page } from 'playwright';
import { startRecording } from './recording.ts';
import { writeJson } from './report.ts';

type MonitorBrowserInput = { browser: Browser; directory: string; label?: () => string | undefined };

let pageCounter = 0;

export const monitorBrowser = ({ browser, directory, label }: MonitorBrowserInput) => {
  const pages = new Map<Page, () => Promise<void>>();
  const contexts = new WeakSet<BrowserContext>();

  const monitorPage = async ({ page }: { page: Page }) => {
    if (pages.has(page)) return;
    const testName = label ? label() : undefined;
    const session = await page.context().newCDPSession(page);
    await session.send('Performance.enable', { timeDomain: 'threadTicks' });
    const initial = await session.send('Performance.getMetrics');
    const initialCpu = initial.metrics.find((metric) => metric.name === 'TaskDuration')?.value ?? 0;

    const slug =
      (testName ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 100)
        .replace(/^-+|-+$/g, '') || 'page';

    const timestamp = Math.floor(Date.now() / 1000);
    pageCounter += 1;
    const name = `${slug}_${timestamp}_${process.pid}-${pageCounter}`;

    const recording = await startRecording({
      name,
      directory,
      scope: 'Application page V8 heap and main-thread CPU; browser RSS unavailable',
      send: async (method, params) => {
        const result = await session.send(method as never, params as never);

        return result;
      },
      read: async () => {
        const memory = await session.send('Runtime.getHeapUsage');
        const { metrics } = await session.send('Performance.getMetrics');
        const cpu = metrics.find((metric) => metric.name === 'TaskDuration')?.value;

        if (cpu === undefined) throw new Error('Missing page CPU metric.');

        const sample = {
          cpuMs: Math.max(0, cpu - initialCpu) * 1000,
          heapUsedBytes: memory.usedSize,
          heapTotalBytes: memory.totalSize,
          rssBytes: null,
        };

        return sample;
      },
    });

    const stop = async () => {
      if (!pages.has(page)) return;
      pages.delete(page);
      const result = await recording.stop();

      try {
        await session.detach();
      } catch (error) {
        result.errors.push(`Detach page profiler: ${String(error)}`);
      }

      await writeJson({
        directory,
        name: `${name}.recording.json`,
        value: { ...result, label: testName, url: page.url() },
      });
    };

    pages.set(page, stop);
    const close = page.close.bind(page);
    page.close = async (options) => {
      try {
        await stop();
      } finally {
        await close(options);
      }
    };
  };

  const monitorContext = ({ context }: { context: BrowserContext }) => {
    if (contexts.has(context)) return;
    contexts.add(context);
    const newPage = context.newPage.bind(context);
    context.newPage = async () => {
      const page = await newPage();
      await monitorPage({ page });

      return page;
    };

    const close = context.close.bind(context);
    context.close = async (options) => {
      try {
        for (const page of context.pages()) {
          const stop = pages.get(page);

          if (stop) await stop();
        }
      } finally {
        await close(options);
      }
    };
  };

  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await newContext(options);
    monitorContext({ context });

    return context;
  };

  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (options) => {
    const page = await newPage(options);
    monitorContext({ context: page.context() });
    await monitorPage({ page });

    return page;
  };

  const close = browser.close.bind(browser);
  browser.close = async (options) => {
    try {
      for (const stop of pages.values()) await stop();
    } finally {
      await close(options);
    }
  };
};
