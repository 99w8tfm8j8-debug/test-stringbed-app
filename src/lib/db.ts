// Small promise wrapper over IndexedDB. No dependency, one database, five stores.
import type { Racquet, Reading, Settings, Setup, StringModel } from './types';

export const DB_NAME = 'stringbed';
export const DB_VERSION = 1;
export type StoreName = 'setups' | 'readings' | 'strings' | 'racquets' | 'kv';
const STORES: StoreName[] = ['setups', 'readings', 'strings', 'racquets', 'kv'];

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class Db {
  private constructor(private readonly db: IDBDatabase) {}

  static open(factory: IDBFactory = indexedDB, name = DB_NAME): Promise<Db> {
    return new Promise((resolve, reject) => {
      const r = factory.open(name, DB_VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        for (const s of STORES) {
          if (db.objectStoreNames.contains(s)) continue;
          const os = db.createObjectStore(s, { keyPath: s === 'kv' ? 'key' : 'id' });
          if (s === 'readings') os.createIndex('setupId', 'setupId');
        }
      };
      r.onsuccess = () => resolve(new Db(r.result));
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('Database upgrade blocked by another open tab.'));
    });
  }

  close(): void { this.db.close(); }

  all<T>(store: StoreName): Promise<T[]> {
    return req(this.db.transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);
  }

  put<T>(store: StoreName, value: T): Promise<void> {
    const tx = this.db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    return done(tx);
  }

  delete(store: StoreName, key: string): Promise<void> {
    const tx = this.db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return done(tx);
  }

  async deleteSetup(id: string): Promise<void> {
    const tx = this.db.transaction(['setups', 'readings'], 'readwrite');
    tx.objectStore('setups').delete(id);
    const idx = tx.objectStore('readings').index('setupId');
    const keys = await req(idx.getAllKeys(id));
    for (const k of keys) tx.objectStore('readings').delete(k);
    return done(tx);
  }

  async getSettings(): Promise<Partial<Settings>> {
    const row = await req(this.db.transaction('kv').objectStore('kv').get('settings') as IDBRequest<{ key: string; value: Partial<Settings> } | undefined>);
    return row?.value ?? {};
  }

  putSettings(value: Settings): Promise<void> {
    return this.put('kv', { key: 'settings', value });
  }

  /** Replace or merge everything from a backup in one transaction. */
  async importAll(data: Backup, mode: 'merge' | 'replace'): Promise<void> {
    const names: StoreName[] = ['setups', 'readings', 'strings', 'racquets'];
    const tx = this.db.transaction(names, 'readwrite');
    if (mode === 'replace') for (const s of names) tx.objectStore(s).clear();
    for (const v of data.setups) tx.objectStore('setups').put(v);
    for (const v of data.readings) tx.objectStore('readings').put(v);
    for (const v of data.strings) tx.objectStore('strings').put(v);
    for (const v of data.racquets) tx.objectStore('racquets').put(v);
    return done(tx);
  }

  async exportAll(): Promise<Backup> {
    const [setups, readings, strings, racquets] = await Promise.all([
      this.all<Setup>('setups'), this.all<Reading>('readings'), this.all<StringModel>('strings'), this.all<Racquet>('racquets'),
    ]);
    return { app: 'stringbed', version: 1, exportedAt: new Date().toISOString(), setups, readings, strings, racquets };
  }
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

export interface Backup {
  app: 'stringbed';
  version: 1;
  exportedAt: string;
  setups: Setup[];
  readings: Reading[];
  /** User-added or user-edited strings only. */
  strings: StringModel[];
  /** User-added or user-edited racquets only. */
  racquets: Racquet[];
}
