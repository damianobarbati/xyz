import { randomBytes } from 'node:crypto';
import { checkTestDatabase, closeTestResources, removeTestUsers } from 'api/testing';
import type { Browser, BrowserContext, Page } from 'playwright';
import { AuthRegisterResponseSchema } from 'types/Auth.ts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ENV } from '../env.ts';
import { browserOptions, clickOptions, createBrowser, typingOptions } from './browser.ts';

let browser: Browser;

let context: BrowserContext;

let page: Page;

let email: string;

beforeAll(async () => {
  await checkTestDatabase();
  browser = await createBrowser();
});

beforeEach(async () => {
  email = `${randomBytes(5).toString('hex')}@example.com`;
  context = await browser.newContext();
  page = await context.newPage();
  page.setDefaultTimeout(browserOptions.headless ? 1_000 : 5_000);
});

afterEach(async () => {
  try {
    if (context) await context.close();
  } finally {
    await removeTestUsers({ emails: [email] });
  }
});

afterAll(async () => {
  try {
    if (browser) await browser.close();
  } finally {
    await closeTestResources();
  }
});

describe('Home', () => {
  describe('registration', () => {
    it('works', async () => {
      await page.goto(ENV.WEB_URL);
      await page.getByRole('button', { name: 'Create an account', exact: true }).click(clickOptions);
      await page.getByLabel('Name', { exact: true }).pressSequentially('Jane Dane', typingOptions);
      await page.getByLabel('Email', { exact: true }).pressSequentially(email, typingOptions);
      await page.getByLabel('Password', { exact: true }).pressSequentially('password', typingOptions);

      const registration = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/auth/register' && response.request().method() === 'POST',
      );

      await page.getByRole('button', { name: 'Create account', exact: true }).click(clickOptions);
      const response = await registration;
      expect(response.status()).toEqual(200);
      AuthRegisterResponseSchema.parse(await response.json());
      await page.waitForURL('**/dashboard');
      await page.getByText('Welcome, Jane Dane.').waitFor();
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toEqual(expect.any(String));
      await page.reload();
      await page.getByText('Welcome, Jane Dane.').waitFor();
    });

    it('fails because email already exists', async () => {
      const response = await page.request.post(`${ENV.API_URL}/auth/register`, {
        timeout: 1_000,
        data: {
          name: 'Jane Dane',
          email,
          password: 'password',
        },
      });

      expect(response.status()).toEqual(200);
      AuthRegisterResponseSchema.parse(await response.json());
      await page.goto(ENV.WEB_URL);
      await page.getByRole('button', { name: 'Create an account', exact: true }).click(clickOptions);
      await page.getByLabel('Name', { exact: true }).pressSequentially('Jane Dane', typingOptions);
      await page.getByLabel('Email', { exact: true }).pressSequentially(email, typingOptions);
      await page.getByLabel('Password', { exact: true }).pressSequentially('password', typingOptions);
      await page.getByRole('button', { name: 'Create account', exact: true }).click(clickOptions);
      const error = page.getByRole('alert');
      await error.waitFor();
      expect(await error.textContent()).toEqual('Email already registered. Sign in instead.');
    });
  });

  describe('login', () => {
    it('works and logs out', async () => {
      const response = await page.request.post(`${ENV.API_URL}/auth/register`, {
        timeout: 1_000,
        data: {
          name: 'Jane Dane',
          email,
          password: 'password',
        },
      });

      expect(response.status()).toEqual(200);
      AuthRegisterResponseSchema.parse(await response.json());
      await page.goto(ENV.WEB_URL);
      await page.getByLabel('Email', { exact: true }).pressSequentially(email, typingOptions);
      await page.getByLabel('Password', { exact: true }).pressSequentially('password', typingOptions);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click(clickOptions);
      await page.waitForURL('**/dashboard');
      await page.getByText('Welcome, Jane Dane.').waitFor();
      await page.reload();
      await page.getByText('Welcome, Jane Dane.').waitFor();
      await page.getByRole('button', { name: 'Logout', exact: true }).click(clickOptions);
      await page.waitForURL(`${ENV.WEB_URL}/`);
      await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
      expect(await page.evaluate(() => localStorage.getItem('token'))).toEqual(null);
      await page.goto(`${ENV.WEB_URL}/dashboard`);
      await page.waitForURL(`${ENV.WEB_URL}/`);
      await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
    });

    it('fails because password is incorrect', async () => {
      const response = await page.request.post(`${ENV.API_URL}/auth/register`, {
        timeout: 1_000,
        data: {
          name: 'Jane Dane',
          email,
          password: 'password',
        },
      });

      expect(response.status()).toEqual(200);
      AuthRegisterResponseSchema.parse(await response.json());
      await page.goto(ENV.WEB_URL);
      await page.getByLabel('Email', { exact: true }).pressSequentially(email, typingOptions);
      await page.getByLabel('Password', { exact: true }).pressSequentially('wrong-password', typingOptions);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click(clickOptions);
      const error = page.getByRole('alert');
      await error.waitFor();
      expect(await error.textContent()).toEqual('Invalid email or password.');
      expect(await page.evaluate(() => localStorage.getItem('token'))).toEqual(null);
    });
  });
});
