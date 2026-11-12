import { once } from 'node:events';
import { createServer, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENV } from '../env.ts';
import { browserOptions, clickOptions, createBrowser, typingOptions } from './browser.ts';

let johnBrowser: Browser;

let janeBrowser: Browser;

let johnStream: ServerResponse;

let streamUrl: string;

const streamProxy = createServer(async (_request, response) => {
  const upstream = await fetch(`${ENV.API_URL}/chat/listen`);

  if (!upstream.body) throw new Error('Missing SSE body');

  response.writeHead(upstream.status, {
    'Content-Type': 'text/event-stream',
    'Access-Control-Allow-Origin': '*',
  });
  const stream = Readable.from(upstream.body);
  response.on('close', () => stream.destroy());
  stream.pipe(response);
  johnStream = response;
});

beforeAll(async () => {
  streamProxy.listen(0, '127.0.0.1');
  await once(streamProxy, 'listening');
  const address = streamProxy.address();

  if (!address || typeof address === 'string') throw new Error('Expected TCP address');

  streamUrl = `http://127.0.0.1:${address.port}/chat/listen`;
  johnBrowser = await createBrowser();
  janeBrowser = await createBrowser();
});

afterAll(async () => {
  if (johnBrowser) await johnBrowser.close();

  if (janeBrowser) await janeBrowser.close();

  const closed = once(streamProxy, 'close');
  streamProxy.closeAllConnections();
  streamProxy.close();
  await closed;
});

describe('Dashboard', () => {
  it('exchanges messages, keeps the composer focused, and reconnects without reloading', async () => {
    const john = await johnBrowser.newPage();
    const jane = await janeBrowser.newPage();
    await john.route('**/chat/listen', async (route) => {
      await route.continue({ url: streamUrl });
    });
    john.setDefaultTimeout(browserOptions.headless ? 2_000 : 5_000);
    jane.setDefaultTimeout(browserOptions.headless ? 2_000 : 5_000);

    await john.goto(ENV.WEB_URL);
    await john.getByLabel('Email', { exact: true }).pressSequentially('john.doe@gmail.com', typingOptions);
    await john.getByLabel('Password', { exact: true }).pressSequentially('password', typingOptions);
    await john.getByRole('button', { name: 'Sign in', exact: true }).click(clickOptions);
    await john.waitForURL('**/dashboard');

    await jane.goto(ENV.WEB_URL);
    await jane.getByLabel('Email', { exact: true }).pressSequentially('jane.dane@gmail.com', typingOptions);
    await jane.getByLabel('Password', { exact: true }).pressSequentially('password', typingOptions);
    await jane.getByRole('button', { name: 'Sign in', exact: true }).click(clickOptions);
    await jane.waitForURL('**/dashboard');

    await john.getByRole('button', { name: 'Send', exact: true }).click({ trial: true });
    await jane.getByRole('button', { name: 'Send', exact: true }).click({ trial: true });
    const johnInput = john.getByLabel('Message', { exact: true });
    const janeInput = jane.getByLabel('Message', { exact: true });
    await expect.poll(() => johnInput.evaluate((input) => input === document.activeElement)).toEqual(true);

    await johnInput.pressSequentially('Hello Jane', typingOptions);
    await johnInput.press('Enter', typingOptions);
    await jane.getByRole('log').getByText('Hello Jane', { exact: true }).waitFor();
    await expect.poll(() => johnInput.inputValue()).toEqual('');
    expect(await johnInput.evaluate((input) => input === document.activeElement)).toEqual(true);

    await janeInput.pressSequentially('Hello John', typingOptions);
    await janeInput.press('Enter', typingOptions);
    await john.getByRole('log').getByText('Hello John', { exact: true }).waitFor();
    await expect.poll(() => janeInput.inputValue()).toEqual('');
    expect(await janeInput.evaluate((input) => input === document.activeElement)).toEqual(true);

    await john.keyboard.type('How are you?', typingOptions);
    await john.keyboard.press('Enter', typingOptions);
    await jane.getByRole('log').getByText('How are you?', { exact: true }).waitFor();
    await expect.poll(() => johnInput.inputValue()).toEqual('');
    expect(await johnInput.evaluate((input) => input === document.activeElement)).toEqual(true);

    await jane.keyboard.type('Fine, thanks', typingOptions);
    await jane.keyboard.press('Enter', typingOptions);
    await john.getByRole('log').getByText('Fine, thanks', { exact: true }).waitFor();
    await expect.poll(() => janeInput.inputValue()).toEqual('');
    expect(await janeInput.evaluate((input) => input === document.activeElement)).toEqual(true);
    expect(await john.getByRole('alert').allTextContents()).toEqual([]);
    expect(await jane.getByRole('alert').allTextContents()).toEqual([]);

    johnStream.destroy();
    await john.getByRole('alert').getByText('Reconnecting...', { exact: true }).waitFor();
    await john.getByRole('button', { name: 'Send', exact: true }).click({ trial: true, timeout: 6000 });
    await janeInput.pressSequentially('Welcome back, John', typingOptions);
    await janeInput.press('Enter', typingOptions);
    await john.getByRole('log').getByText('Welcome back, John', { exact: true }).waitFor();
    await john.getByRole('log').getByText('Hello Jane', { exact: true }).waitFor();
    expect(await john.getByRole('alert').allTextContents()).toEqual([]);
  });
});
