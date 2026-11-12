import { randomBytes } from 'node:crypto';
import { closeTestResources, removeTestUsers } from 'api/testing';
import autocannon from 'autocannon';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { ENV } from '../env.ts';
import { settings } from '../settings.ts';

const budget = settings.load.register;

const emails = new Set<string>();

beforeAll(async () => {
  const health = await fetch(`${ENV.API_URL}/health`);
  expect(health.status).toEqual(200);
});

afterAll(async () => {
  try {
    await removeTestUsers({ emails });
  } finally {
    await closeTestResources();
  }
});

it(`POST ${budget.endpoint} sustains at least ${budget.minRequestsPerSecond} RPS with p99 <= ${budget.maxP99Ms} ms across 100 connections, no errors or timeouts, and only HTTP 200 responses`, async () => {
  const result = await autocannon({
    url: `${ENV.API_URL}${budget.endpoint}`,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    overallRate: budget.minRequestsPerSecond,
    duration: 10,
    connections: 100,
    pipelining: 1,
    ignoreCoordinatedOmission: true,
    requests: [
      {
        setupRequest: (request) => {
          const email = `${randomBytes(5).toString('hex')}@example.com`;
          emails.add(email);
          request.body = JSON.stringify({ name: 'Load User', email, password: 'password' });

          return request;
        },
      },
    ],
  });

  console.log({ 'req/s': result.requests.average, p99: result.latency.p99, p97_5: result.latency.p97_5 });
  expect(result.requests.average).toBeGreaterThanOrEqual(budget.minRequestsPerSecond);
  expect(result.latency.p99).toBeLessThanOrEqual(budget.maxP99Ms);
  expect(result.errors).toEqual(0);
  expect(result.timeouts).toEqual(0);
  expect(result.statusCodeStats).toEqual({ '200': { count: result.requests.total } });
});
