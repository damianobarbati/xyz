import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { errorHandler, registerDocsRoute } from 'nano-fw/docs/index.ts';
import { httpLogger, logRequest } from './middleware/logRequest.ts';
import { router } from './router.ts';

export const app = new Hono();

app.use(cors());

app.use(logRequest);

app.use(prettyJSON({ space: 2 }));

app.use(trimTrailingSlash());

app.onError(errorHandler);

const docsAssets = fileURLToPath(new URL('../docs', import.meta.url));

registerDocsRoute(app, '/', docsAssets, {
  tagOrder: ['Auth', 'Chat', 'Health'],
  logoUrl: '/mark.svg',
  faviconUrl: '/logo.svg',
});

app.route('/', router);

type StartServerInput = { port?: number };

export const startServer = ({ port = 8080 }: StartServerInput = {}) => {
  const server = serve({ fetch: app.fetch, port });

  server.on('listening', () => {
    const address = server.address();

    if (!address || typeof address === 'string') return;
    const host = address.address === '::' ? '127.0.0.1' : address.address;
    httpLogger.info(`API serving at http://${host}:${address.port}`);
  });

  return server;
};

const is_main = import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (is_main) startServer();
