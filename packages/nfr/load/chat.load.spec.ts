import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import autocannon from 'autocannon';
import { AuthLoginResponseSchema } from 'types/Auth.ts';
import { type ChatMessage, ChatMessageSchema } from 'types/Chat.ts';
import { expect, it } from 'vitest';
import { ENV } from '../env.ts';
import { settings } from '../settings.ts';

const budget = settings.load.chat;

const loadTimeoutMs = 30_000;

const requestCount = budget.minRequestsPerSecond * 10;

type Listener = {
  ready: boolean;
  messages: Map<string, ChatMessage>;
};

type Run = {
  prefix: string;
  abort: AbortController;
  failures: unknown[];
  load?: autocannon.Instance;
};

type ReadListenerInput = { listener: Listener; run: Run };

type ReadFrameInput = ReadListenerInput & { frame: string };

const readFrame = ({ frame, listener, run }: ReadFrameInput) => {
  const lines = frame.split('\n');

  if (lines.includes('event: ready')) {
    listener.ready = true;

    return;
  }

  const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart());

  if (!data.length) return;

  const value = JSON.parse(data.join('\n'));

  if (typeof value.text !== 'string' || !value.text.startsWith(run.prefix)) return;

  const message = ChatMessageSchema.parse(value);

  if (listener.messages.has(message.id)) throw new Error(`Duplicate chat message: ${message.id}`);

  listener.messages.set(message.id, message);
};

const readListener = async ({ listener, run }: ReadListenerInput) => {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const signal = AbortSignal.any([run.abort.signal, AbortSignal.timeout(loadTimeoutMs)]);
    const response = await fetch(`${ENV.API_URL}/chat/listen`, { signal });
    expect(response.status).toEqual(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    if (!response.body) throw new Error('Missing SSE body');

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const chunk = await reader.read();

      if (chunk.done) throw new Error('Chat stream closed before test completion');

      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary = buffer.indexOf('\n\n');

      while (boundary !== -1) {
        readFrame({ frame: buffer.slice(0, boundary), listener, run });
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
  } catch (error) {
    if (!run.abort.signal.aborted) {
      run.failures.push(error);

      if (run.load) run.load.stop();
    }
  } finally {
    if (reader) {
      try {
        await reader.cancel();
      } catch (error) {
        if (!run.abort.signal.aborted) run.failures.push(error);
      }
    }
  }
};

it(`POST ${budget.endpoint} sustains at least ${budget.minRequestsPerSecond} RPS with p99 <= ${budget.maxP99Ms} ms across 100 connections, no errors or timeouts, only HTTP 200 responses, and every message delivered exactly once to each of 100 SSE listeners`, {
  timeout: loadTimeoutMs,
}, async () => {
  const run: Run = { prefix: `load-${randomUUID()}:`, abort: new AbortController(), failures: [] };
  const listeners: Listener[] = [];
  const readers: Promise<void>[] = [];
  const messages = new Map<string, ChatMessage>();
  const setupSignal = AbortSignal.timeout(10_000);

  try {
    const health = await fetch(`${ENV.API_URL}/health`, { signal: setupSignal });
    expect(health.status).toEqual(200);

    const login = await fetch(`${ENV.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'john.doe@gmail.com', password: 'password' }),
      signal: setupSignal,
    });

    expect(login.status).toEqual(200);
    const { token } = AuthLoginResponseSchema.parse(await login.json());

    for (let index = 0; index < 100; index++) {
      const listener: Listener = { ready: false, messages: new Map() };
      listeners.push(listener);
      readers.push(readListener({ listener, run }));
    }

    await expect
      .poll(
        () => {
          expect(run.failures).toEqual([]);

          return listeners.filter((listener) => listener.ready).length;
        },
        { timeout: 5_000 },
      )
      .toEqual(100);
    expect(run.failures).toEqual([]);
    let sequence = 0;

    const completed = Promise.withResolvers<autocannon.Result>();

    const load = autocannon(
      {
        url: `${ENV.API_URL}${budget.endpoint}`,
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        overallRate: budget.minRequestsPerSecond,
        amount: requestCount,
        connections: 100,
        pipelining: 1,
        ignoreCoordinatedOmission: true,
        requests: [
          {
            setupRequest: (request, context) => {
              const text = `${run.prefix}${sequence++}`;
              Object.assign(context, { text });
              request.body = JSON.stringify({ text });

              return request;
            },
            onResponse: (status, body, context) => {
              try {
                expect(status).toEqual(200);
                const message = ChatMessageSchema.parse(JSON.parse(body));
                expect(message.text).toEqual((context as { text: string }).text);

                if (messages.has(message.id)) throw new Error(`Duplicate response ID: ${message.id}`);

                messages.set(message.id, message);
              } catch (error) {
                run.failures.push(error);

                if (run.load) run.load.stop();
              }
            },
          },
        ],
      },
      (error, result) => {
        if (error) {
          completed.reject(error);

          return;
        }

        completed.resolve(result);
      },
    );

    run.load = load;
    const result = await completed.promise;
    expect(run.failures).toEqual([]);
    expect(result.errors).toEqual(0);
    expect(result.timeouts).toEqual(0);
    expect(result.statusCodeStats).toEqual({ '200': { count: result.requests.total } });
    expect(result.requests.total).toEqual(requestCount);
    expect(messages.size).toEqual(result.requests.total);
    const deadline = performance.now() + 5_000;

    while (listeners.some((listener) => listener.messages.size < messages.size) && performance.now() < deadline) {
      expect(run.failures).toEqual([]);
      await delay(20);
    }

    expect(run.failures).toEqual([]);

    for (const listener of listeners) expect(listener.messages).toEqual(messages);

    console.log({
      'req/s': result.requests.average,
      p99: result.latency.p99,
      messages: messages.size,
      listeners: listeners.length,
      deliveries: listeners.reduce((total, listener) => total + listener.messages.size, 0),
    });
    expect(result.requests.average).toBeGreaterThanOrEqual(budget.minRequestsPerSecond);
    expect(result.latency.p99).toBeLessThanOrEqual(budget.maxP99Ms);
  } finally {
    if (run.load) run.load.stop();

    run.abort.abort();
    await Promise.all(readers);
  }
});
