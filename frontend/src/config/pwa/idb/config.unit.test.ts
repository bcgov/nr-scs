import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// An in-memory stand-in for the idb database: enough of put/get/delete/getAll/add/transaction
// for the helpers, plus the upgrade callback so store creation is exercised.
const stores = new Map<string, Map<IDBValidKey, unknown>>();
const created: string[] = [];
let seq = 0;
const fakeDb = {
  put: async (store: string, value: unknown, key: IDBValidKey) => void stores.get(store)!.set(key, value),
  get: async (store: string, key: IDBValidKey) => stores.get(store)!.get(key),
  delete: async (store: string, key: IDBValidKey) => void stores.get(store)!.delete(key),
  getAll: async (store: string) => Array.from(stores.get(store)!.values()),
  add: async (store: string, value: unknown) => void stores.get(store)!.set(++seq, value),
  transaction: (store: string) => ({ objectStore: () => ({ name: store }), done: Promise.resolve() }),
};
vi.mock('idb', () => ({
  openDB: vi.fn(async (_name: string, _version: number, { upgrade }: { upgrade: (db: unknown) => void }) => {
    upgrade({
      objectStoreNames: { contains: (name: string) => stores.has(name) },
      createObjectStore: (name: string) => {
        created.push(name);
        stores.set(name, new Map());
      },
    });
    return fakeDb;
  }),
}));

import { CacheVersionMismatchError, NoOfflineItemError } from '@/config/pwa/types';

import {
  addMutation,
  addOfflineItem,
  deleteOfflineItem,
  getAllOfflineItems,
  getAllPendingMutations,
  getOfflineItem,
  runMutationTransaction,
} from './config';

beforeEach(() => {
  stores.clear();
  created.length = 0;
  seq = 0;
});
afterEach(() => vi.useRealTimers());

describe('offline items', () => {
  it('creates both stores on first open and not again', async () => {
    await addOfflineItem('k', 1);
    await addOfflineItem('k2', 2);

    expect(created).toEqual(['mutations', 'offline']);
  });

  it('stores and returns a value', async () => {
    await addOfflineItem('sites', { a: 1 }, 'v1');

    await expect(getOfflineItem<{ a: number }>('sites')).resolves.toEqual({ a: 1 });
    await expect(getOfflineItem('sites', 'v1')).resolves.toEqual({ a: 1 });
  });

  it('rejects a missing key', async () => {
    await addOfflineItem('other', 1);

    await expect(getOfflineItem('missing')).rejects.toBeInstanceOf(NoOfflineItemError);
  });

  it('rejects a version that does not match', async () => {
    await addOfflineItem('sites', { a: 1 }, 'v1');

    await expect(getOfflineItem('sites', 'v2')).rejects.toBeInstanceOf(CacheVersionMismatchError);
  });

  it('drops and rejects an item older than its ttl, but keeps a fresh one', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await addOfflineItem('sites', { a: 1 });

    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
    await expect(getOfflineItem('sites', undefined, 10_000)).resolves.toEqual({ a: 1 });
    await expect(getOfflineItem('sites', undefined, 1_000)).rejects.toBeInstanceOf(NoOfflineItemError);
    expect(await getAllOfflineItems()).toEqual([]);
  });

  it('deletes and lists', async () => {
    await addOfflineItem('a', 1);
    await addOfflineItem('b', 2);
    await deleteOfflineItem('a');

    const all = await getAllOfflineItems<{ value: number }>();
    expect(all.map((x) => x.value)).toEqual([2]);
  });
});

describe('queued mutations', () => {
  it('queues mutations with a timestamp and lists them', async () => {
    await addMutation({ op: 'create' });
    await addMutation({ op: 'delete' });

    const pending = await getAllPendingMutations();
    expect(pending.map((m: { data: { op: string } }) => m.data.op)).toEqual(['create', 'delete']);
    expect(typeof pending[0].timesStamp).toBe('number');
  });

  it('runs a callback against the mutations store and returns its result', async () => {
    const result = await runMutationTransaction('readwrite', async (store) => `${(store as unknown as { name: string }).name}!`);

    expect(result).toBe('mutations!');
  });
});
