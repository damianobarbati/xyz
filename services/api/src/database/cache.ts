import crypto from 'node:crypto';
import { Redis } from 'ioredis';
import type { Knex } from 'knex';
import SimpleQueue from '#api/database/SimpleQueue.ts';
import ENV from '#api/env.ts';

const cache = new Redis(ENV.CACHE_URI);

export default class Cache {
  static cache = cache;
  static queue = new SimpleQueue();

  static async uncache() {
    await cache.flushall();
  }

  static async get(key: string) {
    const value = await cache.get(key);
    const result = value ? JSON.parse(value) : null;
    return result;
  }

  static async set(key: string, data: any, ttl = 3_600 * 24 * 30): Promise<void> {
    await cache.set(key, JSON.stringify(data), 'EX', ttl);
  }

  static async del(key: any): Promise<number> {
    const result = await cache.del.call(cache, key);
    return result;
  }

  static async delScan(pattern: string): Promise<number> {
    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] = await cache.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    let deleted = 0;

    // redis has a limit of ~10000 max args, we chunk in 1000 for headroom
    const chunkSize = 1000;
    for (let i = 0; i < keysToDelete.length; i += chunkSize) {
      const chunk = keysToDelete.slice(i, i + chunkSize);
      const result = await cache.del(...chunk);
      deleted += result;
    }

    return deleted;
  }

  static async fn<T>(key: string, fn: any, ttl?: number): Promise<T> {
    const hit = await Cache.get(key);
    if (hit) return hit;
    const result = await fn();
    await Cache.set(key, result, ttl);
    return result;
  }

  static queryToKey(resource: string, query: Knex.QueryBuilder): string {
    const sql = query.toSQL().toNative();
    const bindings = sql.bindings;
    const query_hash = crypto.createHash('md5').update(JSON.stringify({ sql, bindings })).digest('hex');
    const result = `${resource}:${query_hash}`;
    return result;
  }

  static async cacheQuery<T>(resource: string, query: Knex.QueryBuilder, ttl = 3_600 * 24 * 30): Promise<T> {
    if (!ENV.CACHE_ENABLED) return query;

    // wait all pending uncacheQuery calls to finish before caching resource
    await Cache.queue.wait();

    const result_key = Cache.queryToKey(resource, query);

    /** CACHE HIT **/
    const cached = await Cache.get(result_key);
    if (cached) return cached;

    /** CACHE MISS **/
    // run the query
    const result = await query;
    // we won't cache empty results, as we will not be able to invalidate them since there's no ID inside
    if (!result.length) return result;
    // store the result
    await Cache.set(result_key, result, ttl);

    return result;
  }

  static async uncacheQuery(resource: string) {
    await Cache.delScan(`${resource}:*`);
  }
}

// we run only in the local environment, because in remote environments this is delegated to kube health check relying on the /health endpoint
if (ENV.APP_ENV === 'local' && ENV.NODE_ENV !== 'test') await cache.memory('STATS');
