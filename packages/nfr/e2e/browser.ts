import { chromium, type LaunchOptions } from 'playwright';
import { expect, inject } from 'vitest';
import { ENV } from '../env.ts';

const headed = ENV.E2E_HEADED === '1';

export const browserOptions: LaunchOptions = { headless: !headed, channel: headed ? 'chrome' : undefined };

export const typingOptions = { delay: headed ? 20 : 0 };

export const clickOptions = { delay: headed ? 500 : 0 };

export const createBrowser = async () => {
  const profile = inject('profile' as never) as { endpoint: string; directory: string } | undefined;

  if (!profile) {
    const browser = await chromium.launch(browserOptions);

    return browser;
  }

  const browser = await chromium.connect(profile.endpoint);
  const { monitorBrowser } = await import('../profile/browser.ts');
  monitorBrowser({ browser, directory: profile.directory, label: () => expect.getState().currentTestName });

  return browser;
};
