import { setTimeout } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import SimpleQueue from '#api-database/SimpleQueue.ts';

describe('SimpleQueue', () => {
  const queue = new SimpleQueue();

  it('should process tasks in the queue one by one', async () => {
    const results: any[] = [];

    async function fn(index) {
      await setTimeout(200);
      results.push(index);
    }

    async function fnWaiting(index) {
      await queue.wait();
      results.push(index);
    }

    void queue.enqueue(() => fn(1));
    void queue.enqueue(() => fn(2));
    void (await fnWaiting(3));
    void queue.enqueue(() => fn(4));
    void queue.enqueue(() => fn(5));
    void (await fnWaiting(6));

    expect(results).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
