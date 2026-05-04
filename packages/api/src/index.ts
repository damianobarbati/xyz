import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { trimTrailingSlash } from 'hono/trailing-slash';

export const app = new Hono();
app.use(logger());
app.use(prettyJSON({ space: 2 }));
app.use(trimTrailingSlash());

// curl localhost:8080/healthcheck
app.get('/healthcheck', (ctx) => {
  const result = true;
  return ctx.json(result);
});

// curl localhost:8080/ping -H "Content-Type: application/json" -d '{"hello": "world"}'
app.post('/ping', async (ctx) => {
  const body = await ctx.req.json();
  return ctx.json(body);
});

const is_main = import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (is_main) serve({ fetch: app.fetch, port: 8080 });
