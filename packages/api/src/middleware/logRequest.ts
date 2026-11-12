import { randomBytes } from 'node:crypto';
import { getConnInfo } from '@hono/node-server/conninfo';
import { createMiddleware } from 'hono/factory';
import { pino } from 'pino';

type LogLine = {
  timestamp: string;
  msg: string;
};

export const httpLogger = pino(
  {
    level: 'info',
    base: null,
    timestamp: () => `"timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level: () => ({}),
    },
  },
  {
    write: (line: string) => {
      const { timestamp, msg }: LogLine = JSON.parse(line);
      process.stdout.write(`${timestamp} ${msg.replace(/[\r\n]/g, ' ')}\n`);
    },
  },
);

export const logRequest = createMiddleware(async (context, next) => {
  const start = performance.now();
  const request_id = randomBytes(5).toString('hex');
  let ip: string | undefined;

  if (context.env) {
    const info = getConnInfo(context);
    ip = info.remote.address;
  }

  context.header('X-Request-ID', request_id);
  await next();
  const status = context.res.status;

  const fields = {
    request_id,
    client_ip: ip,
    method: context.req.method,
    path: context.req.path,
    status,
    duration_ms: Math.round(performance.now() - start),
  };

  httpLogger.info(
    `IP=${ip ?? '-'} TXID=${request_id} ${fields.method} ${fields.path} ${status} ${fields.duration_ms}ms`,
  );
});
