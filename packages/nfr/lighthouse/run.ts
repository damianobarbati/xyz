import { mkdir, rm, writeFile } from 'node:fs/promises';
import lighthouse, { type Flags } from 'lighthouse';
import { chromium } from 'playwright';
import { ENV } from '../env.ts';
import { settings as baselineSettings } from '../settings.ts';

const settings = baselineSettings.lighthouse;

const failures: string[] = [];

await rm(new URL('../../../.report-nfr-lighthouse/', import.meta.url), { recursive: true, force: true });

for (const route of ['home', 'dashboard']) {
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${settings.options.port}`] });

  try {
    const connectionBrowser = await chromium.connectOverCDP(`http://127.0.0.1:${settings.options.port}`);
    const page = await connectionBrowser.contexts()[0].newPage();
    await page.goto(ENV.WEB_URL);

    if (route === 'dashboard') {
      const configurationResponse = await page.request.get(`${ENV.WEB_URL}/env.json`);

      if (!configurationResponse.ok()) throw new Error('Cannot load Lighthouse API configuration.');
      const configuration = await configurationResponse.json();

      if (!configuration || typeof configuration.API_URL !== 'string') {
        throw new Error('Lighthouse API configuration requires API_URL.');
      }

      const apiUrl = new URL(configuration.API_URL);

      if (!['http:', 'https:'].includes(apiUrl.protocol)) {
        throw new Error('Lighthouse API_URL must use HTTP or HTTPS.');
      }

      const response = await page.request.post(`${apiUrl.href.replace(/\/$/, '')}/auth/login`, {
        data: { email: 'john.doe@gmail.com', password: 'password' },
      });

      if (!response.ok()) throw new Error('Lighthouse login failed. Start the API with local seed data.');
      const { token } = await response.json();

      if (typeof token !== 'string') throw new Error('Lighthouse login returned no token.');
      await page.evaluate((value) => localStorage.setItem('token', value), token);
      await page.goto(`${ENV.WEB_URL}/dashboard`);
      await page.getByText('Welcome, John Doe.').waitFor();
    }

    const connection = await page.context().newCDPSession(page);

    const url = route === 'home' ? ENV.WEB_URL : `${ENV.WEB_URL}/dashboard`;
    await connection.send('Network.clearBrowserCache');

    const options: Flags = {
      ...settings.options,
      output: ['html', 'json'],
      disableStorageReset: route === 'dashboard',
    };

    const result = await lighthouse(url, options);

    if (!result) throw new Error(`Lighthouse ${route} returned no result.`);
    const directory = new URL(`../../../.report-nfr-lighthouse/${route}/`, import.meta.url);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL('report.html', directory), result.report[0]);
    await writeFile(new URL('report.json', directory), result.report[1]);
    const { lhr } = result;

    if (lhr.runtimeError) failures.push(`${route}: ${lhr.runtimeError.message}`);

    if (new URL(lhr.finalDisplayedUrl).pathname !== new URL(url).pathname) {
      failures.push(`${route}: unexpected redirect.`);
    }

    for (const category of settings.categories) {
      const score = lhr.categories[category]?.score;

      if (typeof score !== 'number' || score < settings.minScore) {
        failures.push(`${route}: ${category} score ${score}, minimum ${settings.minScore}.`);
      }
    }

    const summary = lhr.audits['resource-summary'].details;

    const script =
      summary && 'items' in summary ? summary.items.find((item) => item.resourceType === 'script') : undefined;

    const bytes = script?.transferSize;

    if (typeof bytes !== 'number' || bytes > settings.maxJavaScriptBytes) {
      failures.push(`${route}: JavaScript ${bytes} bytes, maximum ${settings.maxJavaScriptBytes}.`);
    }

    const status = lhr.audits['http-status-code'].score;

    if (status !== 1) failures.push(`${route}: HTTP status audit failed.`);
    console.log(`Lighthouse ${route}: reports saved to ${directory.pathname}`);
  } finally {
    await browser.close();
  }
}

if (failures.length) throw new Error(failures.join('\n'));
