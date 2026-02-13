import { setTimeout } from 'node:timers/promises';
import type { UserRow } from 'types/User.ts';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import Cache from '#api/database/cache.ts';
import database from '#api/database/database.ts';

describe.skipIf(!process.env.CACHE_ENABLED)('Cache', () => {
  let cacheGetSpy: MockInstance;
  let cacheSetSpy: MockInstance;
  let cacheQuerySpy: MockInstance;
  let uncacheQuerySpy: MockInstance;

  beforeEach(async () => {
    vi.restoreAllMocks();
    cacheGetSpy = vi.spyOn(Cache, 'get');
    cacheSetSpy = vi.spyOn(Cache, 'set');
    cacheQuerySpy = vi.spyOn(Cache, 'cacheQuery');
    uncacheQuerySpy = vi.spyOn(Cache, 'uncacheQuery');
    await Cache.cache.flushall();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should list all the shipments and return the cached version for idem requests', async () => {
    /** CACHE MISS **/
    cacheGetSpy.mockClear();
    cacheSetSpy.mockClear();
    cacheQuerySpy.mockClear();
    uncacheQuerySpy.mockClear();
    const query_t1 = database<UserRow>('users').select().where({ role: 'DRIVER' });
    const result_t1 = await Cache.cacheQuery<UserRow[]>('users', query_t1);
    // uncached value so cacheSet is called
    expect(cacheQuerySpy).toHaveBeenCalledTimes(1);
    expect(cacheGetSpy).toHaveBeenCalledTimes(1);
    expect(cacheSetSpy).toHaveBeenCalledTimes(1);

    /** CACHE HIT **/
    cacheGetSpy.mockClear();
    cacheSetSpy.mockClear();
    cacheQuerySpy.mockClear();
    uncacheQuerySpy.mockClear();
    const query_t2 = database<UserRow>('users').select().where({ role: 'DRIVER' });
    const result_t2 = await Cache.cacheQuery<UserRow[]>('users', query_t2);
    // uncached value so set is called
    expect(cacheQuerySpy).toHaveBeenCalledTimes(1);
    expect(cacheGetSpy).toHaveBeenCalledTimes(1);
    expect(cacheSetSpy).toHaveBeenCalledTimes(0);
    expect(result_t2).toEqual(result_t1);

    /** AUTOMATIC INVALIDATION ON UPDATE THUS CACHE MISS **/
    cacheGetSpy.mockClear();
    cacheSetSpy.mockClear();
    cacheQuerySpy.mockClear();
    uncacheQuerySpy.mockClear();
    await database<UserRow>('users').update({ email: 'xyz@xyz' }).where({ id: result_t1[0].id }).returning('*');
    await setTimeout(1000); // watch out! the cache flush is asynchronous, and you should not expect it to happen right before your next query
    const query_t3 = database<UserRow>('users').select().where({ role: 'DRIVER' });
    const result_t3 = await Cache.cacheQuery<UserRow[]>('users', query_t3);
    // uncached value so set is called
    expect(uncacheQuerySpy).toHaveBeenCalledTimes(1);
    expect(cacheQuerySpy).toHaveBeenCalledTimes(1);
    expect(cacheGetSpy).toHaveBeenCalledTimes(1);
    expect(cacheSetSpy).toHaveBeenCalledTimes(1);

    /** MANUAL INVALIDATION ON UPDATE THUS CACHE MISS **/
    cacheGetSpy.mockClear();
    cacheSetSpy.mockClear();
    cacheQuerySpy.mockClear();
    uncacheQuerySpy.mockClear();
    await Cache.uncacheQuery('users');
    await setTimeout(1000); // watch out! the cache flush is asynchronous, and you should not expect it to happen right before your next query
    const query_t4 = database<UserRow>('users').select().where({ role: 'DRIVER' });
    const result_t4 = await Cache.cacheQuery<UserRow[]>('users', query_t4);
    // uncached value so set is called
    expect(uncacheQuerySpy).toHaveBeenCalledTimes(1);
    expect(cacheQuerySpy).toHaveBeenCalledTimes(1);
    expect(cacheGetSpy).toHaveBeenCalledTimes(1);
    expect(cacheSetSpy).toHaveBeenCalledTimes(1);
    expect(result_t4).toEqual(result_t3);
  });
});
